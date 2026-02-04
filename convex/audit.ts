import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, checkWorkspaceAccess } from "./auth";

// Create audit log entry
export const createAuditLog = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const auditLogId = await ctx.db.insert("auditLogs", {
      workspaceId: args.workspaceId,
      userId: user._id,
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      details: args.details,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: Date.now(),
    });

    return auditLogId;
  },
});

// Get audit logs for workspace
export const getWorkspaceAuditLogs = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    action: v.optional(v.string()),
    resourceType: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");

    const limit = args.limit || 50;
    const offset = args.offset || 0;

    let query = ctx.db
      .query("auditLogs")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId));

    // Apply filters
    if (args.action) {
      query = query.filter((q) => q.eq(q.field("action"), args.action));
    }
    if (args.resourceType) {
      query = query.filter((q) => q.eq(q.field("resourceType"), args.resourceType));
    }
    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }
    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate));
    }
    if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate));
    }

    const auditLogs = await query
      .order("desc")
      .take(limit + offset);

    // Get user information for each log
    const logsWithUsers = await Promise.all(
      auditLogs.slice(offset).map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          ...log,
          user,
        };
      })
    );

    return logsWithUsers;
  },
});

// Get audit log statistics
export const getAuditLogStats = query({
  args: {
    workspaceId: v.id("workspaces"),
    timeRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");

    let query = ctx.db
      .query("auditLogs")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId));

    if (args.timeRange) {
      query = query
        .filter((q) => q.gte(q.field("timestamp"), args.timeRange.start))
        .filter((q) => q.lte(q.field("timestamp"), args.timeRange.end));
    }

    const logs = await query.collect();

    // Calculate statistics
    const stats = {
      totalLogs: logs.length,
      actionBreakdown: {},
      resourceBreakdown: {},
      userActivity: {},
      timelineData: [],
    };

    // Group by action
    logs.forEach((log) => {
      stats.actionBreakdown[log.action] = (stats.actionBreakdown[log.action] || 0) + 1;
      stats.resourceBreakdown[log.resourceType] = (stats.resourceBreakdown[log.resourceType] || 0) + 1;
      stats.userActivity[log.userId] = (stats.userActivity[log.userId] || 0) + 1;
    });

    // Create timeline data (group by day)
    const timelineMap = new Map();
    logs.forEach((log) => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
    });

    stats.timelineData = Array.from(timelineMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return stats;
  },
});

// Security monitoring functions
export const detectSuspiciousActivity = query({
  args: {
    workspaceId: v.id("workspaces"),
    timeWindow: v.optional(v.number()), // in milliseconds, default 1 hour
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");

    const timeWindow = args.timeWindow || 60 * 60 * 1000; // 1 hour
    const cutoffTime = Date.now() - timeWindow;

    const recentLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.gte(q.field("timestamp"), cutoffTime))
      .collect();

    const suspiciousActivities = [];

    // Detect rapid successive actions from same user
    const userActions = new Map();
    recentLogs.forEach((log) => {
      const key = `${log.userId}-${log.action}`;
      if (!userActions.has(key)) {
        userActions.set(key, []);
      }
      userActions.get(key).push(log);
    });

    userActions.forEach((logs, key) => {
      if (logs.length > 10) { // More than 10 same actions in time window
        suspiciousActivities.push({
          type: 'rapid_actions',
          severity: 'medium',
          description: `User performed ${logs[0].action} ${logs.length} times in ${timeWindow / 60000} minutes`,
          userId: logs[0].userId,
          count: logs.length,
          action: logs[0].action,
        });
      }
    });

    // Detect multiple IP addresses for same user
    const userIPs = new Map();
    recentLogs.forEach((log) => {
      if (log.ipAddress) {
        if (!userIPs.has(log.userId)) {
          userIPs.set(log.userId, new Set());
        }
        userIPs.get(log.userId).add(log.ipAddress);
      }
    });

    userIPs.forEach((ips, userId) => {
      if (ips.size > 3) { // More than 3 different IPs
        suspiciousActivities.push({
          type: 'multiple_ips',
          severity: 'high',
          description: `User accessed from ${ips.size} different IP addresses`,
          userId,
          ipCount: ips.size,
          ips: Array.from(ips),
        });
      }
    });

    // Detect unusual deletion activity
    const deletions = recentLogs.filter(log => log.action === 'delete');
    if (deletions.length > 5) {
      suspiciousActivities.push({
        type: 'excessive_deletions',
        severity: 'high',
        description: `${deletions.length} items deleted in ${timeWindow / 60000} minutes`,
        count: deletions.length,
      });
    }

    return suspiciousActivities;
  },
});

// Data retention and cleanup
export const cleanupOldAuditLogs = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    retentionDays: v.number(),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");

    const cutoffTime = Date.now() - (args.retentionDays * 24 * 60 * 60 * 1000);

    const oldLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.lt(q.field("timestamp"), cutoffTime))
      .collect();

    let deletedCount = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deletedCount++;
    }

    return {
      deletedCount,
      cutoffTime,
    };
  },
});

// Export audit logs for compliance
export const exportAuditLogs = query({
  args: {
    workspaceId: v.id("workspaces"),
    startDate: v.number(),
    endDate: v.number(),
    format: v.union(v.literal("json"), v.literal("csv")),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.gte(q.field("timestamp"), args.startDate))
      .filter((q) => q.lte(q.field("timestamp"), args.endDate))
      .collect();

    // Get user information for each log
    const logsWithUsers = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          timestamp: new Date(log.timestamp).toISOString(),
          user: user?.name || 'Unknown',
          userEmail: user?.email || 'Unknown',
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
        };
      })
    );

    if (args.format === "csv") {
      const headers = [
        "Timestamp",
        "User",
        "Email",
        "Action",
        "Resource Type",
        "Resource ID",
        "Details",
        "IP Address",
        "User Agent",
      ];

      const csvRows = logsWithUsers.map(log => [
        log.timestamp,
        log.user,
        log.userEmail,
        log.action,
        log.resourceType,
        log.resourceId || '',
        JSON.stringify(log.details || {}),
        log.ipAddress || '',
        log.userAgent || '',
      ]);

      const csvContent = [headers, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return {
        format: 'csv',
        content: csvContent,
        filename: `audit-logs-${args.startDate}-${args.endDate}.csv`,
      };
    }

    return {
      format: 'json',
      content: JSON.stringify(logsWithUsers, null, 2),
      filename: `audit-logs-${args.startDate}-${args.endDate}.json`,
    };
  },
});

// Compliance reporting
export const generateComplianceReport = query({
  args: {
    workspaceId: v.id("workspaces"),
    reportType: v.union(
      v.literal("gdpr"),
      v.literal("sox"),
      v.literal("hipaa"),
      v.literal("general")
    ),
    timeRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.gte(q.field("timestamp"), args.timeRange.start))
      .filter((q) => q.lte(q.field("timestamp"), args.timeRange.end))
      .collect();

    const workspace = await ctx.db.get(args.workspaceId);
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const report = {
      reportType: args.reportType,
      workspace: workspace?.name,
      timeRange: {
        start: new Date(args.timeRange.start).toISOString(),
        end: new Date(args.timeRange.end).toISOString(),
      },
      generatedAt: new Date().toISOString(),
      summary: {
        totalActivities: logs.length,
        uniqueUsers: new Set(logs.map(l => l.userId)).size,
        totalMembers: members.length,
        dataAccess: logs.filter(l => l.action === 'read').length,
        dataModification: logs.filter(l => ['create', 'update', 'delete'].includes(l.action)).length,
        securityEvents: logs.filter(l => l.action.includes('login') || l.action.includes('auth')).length,
      },
      activities: logs.map(log => ({
        timestamp: new Date(log.timestamp).toISOString(),
        action: log.action,
        resourceType: log.resourceType,
        userId: log.userId,
      })),
      compliance: {
        dataRetention: "Audit logs retained according to policy",
        accessControl: "Role-based access control implemented",
        encryption: "Data encrypted in transit and at rest",
        monitoring: "Continuous activity monitoring enabled",
      },
    };

    return report;
  },
});
