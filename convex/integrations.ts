import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { requireAuth, checkWorkspaceAccess } from "./auth";

// Create a new integration
export const createIntegration = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    type: v.union(
      v.literal("google_calendar"),
      v.literal("slack"),
      v.literal("github"),
      v.literal("outlook"),
      v.literal("zapier")
    ),
    name: v.string(),
    config: v.any(),
    credentials: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");
    const user = await requireAuth(ctx);

    const integrationId = await ctx.db.insert("integrations", {
      workspaceId: args.workspaceId,
      type: args.type,
      name: args.name,
      config: args.config,
      credentials: args.credentials,
      isActive: true,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return integrationId;
  },
});

// Get workspace integrations
export const getWorkspaceIntegrations = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId);

    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Remove sensitive credentials from response
    return integrations.map(integration => ({
      ...integration,
      credentials: undefined,
      hasCredentials: !!integration.credentials,
    }));
  },
});

// Update integration
export const updateIntegration = mutation({
  args: {
    integrationId: v.id("integrations"),
    config: v.optional(v.any()),
    credentials: v.optional(v.any()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    await checkWorkspaceAccess(ctx, integration.workspaceId, "admin");

    const updates: any = {};
    if (args.config !== undefined) updates.config = args.config;
    if (args.credentials !== undefined) updates.credentials = args.credentials;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.integrationId, updates);
    return true;
  },
});

// Delete integration
export const deleteIntegration = mutation({
  args: {
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    await checkWorkspaceAccess(ctx, integration.workspaceId, "admin");
    await ctx.db.delete(args.integrationId);
    return true;
  },
});

// Update integration sync time (internal mutation)
export const updateIntegrationSync = mutation({
  args: {
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.integrationId, {
      lastSync: Date.now(),
    });
    return true;
  },
});

// Sync with Google Calendar
export const syncGoogleCalendar = action({
  args: {
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    // In a real implementation, you would:
    // 1. Use the stored credentials to authenticate with Google Calendar API
    // 2. Fetch events from the calendar
    // 3. Create or update todos based on calendar events
    // 4. Update the lastSync timestamp

    try {
      // Placeholder for Google Calendar API integration
      const syncResult = {
        eventsProcessed: 0,
        todosCreated: 0,
        todosUpdated: 0,
        errors: [],
      };

      // Update last sync time using mutation
      await ctx.runMutation(api.integrations.updateIntegrationSync, {
        integrationId: args.integrationId,
      });

      return syncResult;
    } catch (error) {
      console.error("Google Calendar sync error:", error);
      throw new Error("Failed to sync with Google Calendar");
    }
  },
});

// Send Slack notification
export const sendSlackNotification = action({
  args: {
    integrationId: v.id("integrations"),
    message: v.string(),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // In a real implementation, you would:
      // 1. Use the stored webhook URL or bot token
      // 2. Send the message to the specified channel
      // 3. Handle response and errors

      // Placeholder for Slack API integration
      const result = {
        success: true,
        messageId: "placeholder_message_id",
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      console.error("Slack notification error:", error);
      throw new Error("Failed to send Slack notification");
    }
  },
});

// Create webhook
export const createWebhook = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");
    const user = await requireAuth(ctx);

    const webhookId = await ctx.db.insert("webhooks", {
      workspaceId: args.workspaceId,
      url: args.url,
      events: args.events,
      secret: args.secret,
      isActive: true,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return webhookId;
  },
});

// Get workspace webhooks
export const getWorkspaceWebhooks = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");

    const webhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return webhooks;
  },
});

// Trigger webhook
export const triggerWebhook = action({
  args: {
    workspaceId: v.id("workspaces"),
    event: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const webhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const relevantWebhooks = webhooks.filter(webhook =>
      webhook.events.includes(args.event)
    );

    const results = [];
    for (const webhook of relevantWebhooks) {
      try {
        // In a real implementation, you would:
        // 1. Create the webhook payload
        // 2. Sign it with the secret if provided
        // 3. Send HTTP POST request to the webhook URL
        // 4. Handle response and retries

        // Placeholder for webhook HTTP request
        const result = {
          webhookId: webhook._id,
          success: true,
          statusCode: 200,
          timestamp: Date.now(),
        };

        // Update last triggered time
        await ctx.db.patch(webhook._id, {
          lastTriggered: Date.now(),
        });

        results.push(result);
      } catch (error) {
        console.error(`Webhook ${webhook._id} failed:`, error);
        results.push({
          webhookId: webhook._id,
          success: false,
          error: error.message,
          timestamp: Date.now(),
        });
      }
    }

    return results;
  },
});

// Import data from external service
export const importData = action({
  args: {
    workspaceId: v.id("workspaces"),
    source: v.union(
      v.literal("todoist"),
      v.literal("asana"),
      v.literal("notion"),
      v.literal("trello")
    ),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "editor");
    const user = await requireAuth(ctx);

    try {
      const importResult = {
        todosImported: 0,
        sectionsImported: 0,
        errors: [],
      };

      // Process import data based on source
      switch (args.source) {
        case "todoist":
          // Parse Todoist export format
          break;
        case "asana":
          // Parse Asana export format
          break;
        case "notion":
          // Parse Notion export format
          break;
        case "trello":
          // Parse Trello export format
          break;
      }

      // In a real implementation, you would:
      // 1. Parse the imported data according to the source format
      // 2. Create todos and sections in the database
      // 3. Handle duplicates and conflicts
      // 4. Return detailed import results

      return importResult;
    } catch (error) {
      console.error("Import error:", error);
      throw new Error(`Failed to import data from ${args.source}`);
    }
  },
});

// Export data to external format
export const exportData = action({
  args: {
    workspaceId: v.id("workspaces"),
    format: v.union(
      v.literal("json"),
      v.literal("csv"),
      v.literal("todoist"),
      v.literal("asana")
    ),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId);

    try {
      // Get all workspace data
      const todos = await ctx.db
        .query("todos")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();

      const sections = await ctx.db
        .query("sections")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();

      // Format data according to requested format
      let exportData;
      switch (args.format) {
        case "json":
          exportData = {
            todos,
            sections,
            exportedAt: Date.now(),
          };
          break;
        case "csv":
          // Convert to CSV format
          exportData = convertToCSV(todos);
          break;
        case "todoist":
          // Convert to Todoist import format
          exportData = convertToTodoist(todos);
          break;
        case "asana":
          // Convert to Asana import format
          exportData = convertToAsana(todos, sections);
          break;
        default:
          throw new Error("Unsupported export format");
      }

      return {
        data: exportData,
        format: args.format,
        exportedAt: Date.now(),
        itemCount: todos.length,
      };
    } catch (error) {
      console.error("Export error:", error);
      throw new Error(`Failed to export data in ${args.format} format`);
    }
  },
});

// Helper functions for data conversion
function convertToCSV(todos: any[]) {
  const headers = ["Title", "Done", "Priority", "Category", "Deadline", "Notes"];
  const rows = todos.map(todo => [
    todo.text,
    todo.done ? "Yes" : "No",
    todo.priority || "",
    todo.category || "",
    todo.deadline || "",
    todo.notes || "",
  ]);

  return [headers, ...rows].map(row => row.join(",")).join("\n");
}

function convertToTodoist(todos: any[]) {
  return todos.map(todo => ({
    content: todo.text,
    completed: todo.done,
    priority: todo.priority === "high" ? 4 : todo.priority === "medium" ? 3 : 2,
    due_date: todo.deadline,
    description: todo.notes,
  }));
}

function convertToAsana(todos: any[], sections: any[]) {
  return {
    projects: sections.map(section => ({
      name: section.title,
      tasks: todos
        .filter(todo => todo.sectionId === section._id)
        .map(todo => ({
          name: todo.text,
          completed: todo.done,
          notes: todo.notes,
          due_on: todo.deadline,
        })),
    })),
  };
}
