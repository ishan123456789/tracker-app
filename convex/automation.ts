import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { requireAuth, checkWorkspaceAccess } from "./auth";

// Create automation rule
export const createAutomationRule = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    trigger: v.object({
      type: v.string(),
      conditions: v.any(),
    }),
    actions: v.array(v.object({
      type: v.string(),
      parameters: v.any(),
    })),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");
    const user = await requireAuth(ctx);

    const ruleId = await ctx.db.insert("automationRules", {
      workspaceId: args.workspaceId,
      name: args.name,
      description: args.description,
      trigger: args.trigger,
      actions: args.actions,
      isActive: true,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return ruleId;
  },
});

// Get workspace automation rules
export const getWorkspaceAutomationRules = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId);

    const rules = await ctx.db
      .query("automationRules")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return rules;
  },
});

// Update automation rule
export const updateAutomationRule = mutation({
  args: {
    ruleId: v.id("automationRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    trigger: v.optional(v.object({
      type: v.string(),
      conditions: v.any(),
    })),
    actions: v.optional(v.array(v.object({
      type: v.string(),
      parameters: v.any(),
    }))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Automation rule not found");
    }

    await checkWorkspaceAccess(ctx, rule.workspaceId, "admin");

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.trigger !== undefined) updates.trigger = args.trigger;
    if (args.actions !== undefined) updates.actions = args.actions;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.ruleId, updates);
    return true;
  },
});

// Delete automation rule
export const deleteAutomationRule = mutation({
  args: {
    ruleId: v.id("automationRules"),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Automation rule not found");
    }

    await checkWorkspaceAccess(ctx, rule.workspaceId, "admin");
    await ctx.db.delete(args.ruleId);
    return true;
  },
});

// Create AI suggestion
export const createAISuggestion = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("task_categorization"),
      v.literal("deadline_suggestion"),
      v.literal("priority_suggestion"),
      v.literal("similar_tasks")
    ),
    targetId: v.string(),
    suggestion: v.any(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const suggestionId = await ctx.db.insert("aiSuggestions", {
      userId: args.userId,
      type: args.type,
      targetId: args.targetId,
      suggestion: args.suggestion,
      confidence: args.confidence,
      createdAt: Date.now(),
    });

    return suggestionId;
  },
});

// Get AI suggestions for user
export const getUserAISuggestions = query({
  args: {
    type: v.optional(v.union(
      v.literal("task_categorization"),
      v.literal("deadline_suggestion"),
      v.literal("priority_suggestion"),
      v.literal("similar_tasks")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const limit = args.limit || 20;

    let query = ctx.db
      .query("aiSuggestions")
      .withIndex("by_user", (q) => q.eq("userId", user._id));

    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }

    const suggestions = await query
      .order("desc")
      .take(limit);

    return suggestions;
  },
});

// Accept AI suggestion
export const acceptAISuggestion = mutation({
  args: {
    suggestionId: v.id("aiSuggestions"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const suggestion = await ctx.db.get(args.suggestionId);

    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    if (suggestion.userId !== user._id) {
      throw new Error("You can only accept your own suggestions");
    }

    await ctx.db.patch(args.suggestionId, {
      isAccepted: true,
    });

    return true;
  },
});

// Generate smart task suggestions based on patterns
export const generateTaskSuggestions = action({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would:
    // 1. Analyze user's task history and patterns
    // 2. Use ML/AI to generate relevant suggestions
    // 3. Consider current context (time, day, workload)
    // 4. Return personalized task suggestions

    try {
      // Placeholder for AI/ML logic
      const suggestions = [
        {
          type: "task_categorization",
          suggestion: {
            category: "Development",
            confidence: 0.85,
            reason: "Based on similar tasks you've created"
          }
        },
        {
          type: "deadline_suggestion",
          suggestion: {
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            confidence: 0.75,
            reason: "Similar tasks typically take 5-7 days"
          }
        },
        {
          type: "priority_suggestion",
          suggestion: {
            priority: "medium",
            confidence: 0.70,
            reason: "Based on your current workload"
          }
        }
      ];

      // Store suggestions in database
      for (const suggestion of suggestions) {
        await ctx.runMutation(api.automation.createAISuggestion, {
          userId: args.userId,
          type: suggestion.type,
          targetId: args.context?.todoId || "general",
          suggestion: suggestion.suggestion,
          confidence: suggestion.suggestion.confidence,
        });
      }

      return suggestions;
    } catch (error) {
      console.error("Error generating task suggestions:", error);
      throw new Error("Failed to generate task suggestions");
    }
  },
});

// Analyze task patterns for insights
export const analyzeTaskPatterns = action({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    timeRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    try {
      // In a real implementation, this would:
      // 1. Fetch user's task data within the time range
      // 2. Analyze patterns (completion times, categories, priorities)
      // 3. Identify trends and anomalies
      // 4. Generate actionable insights

      const insights = {
        productivity_patterns: {
          peak_hours: [9, 10, 14, 15], // Hours when most productive
          peak_days: ["Tuesday", "Wednesday", "Thursday"],
          completion_rate: 0.78,
          average_task_duration: 2.5, // hours
        },
        category_analysis: {
          most_common: "Development",
          completion_rates: {
            "Development": 0.85,
            "Meetings": 0.95,
            "Planning": 0.70,
            "Research": 0.65,
          }
        },
        recommendations: [
          {
            type: "schedule_optimization",
            message: "Schedule important tasks between 9-10 AM for best results",
            confidence: 0.82
          },
          {
            type: "workload_balance",
            message: "Consider reducing research tasks on Mondays",
            confidence: 0.75
          },
          {
            type: "deadline_management",
            message: "Add 20% buffer time to development tasks",
            confidence: 0.88
          }
        ]
      };

      return insights;
    } catch (error) {
      console.error("Error analyzing task patterns:", error);
      throw new Error("Failed to analyze task patterns");
    }
  },
});

// Smart task categorization
export const categorizeTask = action({
  args: {
    taskText: v.string(),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      // In a real implementation, this would use NLP/ML to categorize tasks
      // For now, we'll use simple keyword matching

      const categories = {
        "Development": ["code", "develop", "build", "implement", "fix", "debug", "program"],
        "Meeting": ["meeting", "call", "discuss", "sync", "standup", "review"],
        "Planning": ["plan", "design", "strategy", "roadmap", "brainstorm", "outline"],
        "Research": ["research", "investigate", "analyze", "study", "explore", "learn"],
        "Documentation": ["document", "write", "update", "readme", "wiki", "guide"],
        "Testing": ["test", "qa", "verify", "validate", "check", "quality"],
        "Deployment": ["deploy", "release", "publish", "launch", "ship"],
        "Maintenance": ["maintain", "update", "upgrade", "patch", "refactor"],
      };

      const taskLower = args.taskText.toLowerCase();
      let bestMatch = { category: "General", confidence: 0.3 };

      for (const [category, keywords] of Object.entries(categories)) {
        const matches = keywords.filter(keyword => taskLower.includes(keyword));
        if (matches.length > 0) {
          const confidence = Math.min(0.9, 0.4 + (matches.length * 0.2));
          if (confidence > bestMatch.confidence) {
            bestMatch = { category, confidence };
          }
        }
      }

      return {
        category: bestMatch.category,
        confidence: bestMatch.confidence,
        alternatives: Object.keys(categories).filter(c => c !== bestMatch.category).slice(0, 3)
      };
    } catch (error) {
      console.error("Error categorizing task:", error);
      throw new Error("Failed to categorize task");
    }
  },
});

// Smart deadline suggestion
export const suggestDeadline = action({
  args: {
    taskText: v.string(),
    category: v.optional(v.string()),
    priority: v.optional(v.string()),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      // In a real implementation, this would analyze historical data
      // and use ML to predict realistic deadlines

      const baseDurations = {
        "Development": 5, // days
        "Meeting": 0.1,
        "Planning": 2,
        "Research": 3,
        "Documentation": 1,
        "Testing": 2,
        "Deployment": 1,
        "Maintenance": 1,
        "General": 3,
      };

      const priorityMultipliers = {
        "high": 0.7,
        "medium": 1.0,
        "low": 1.5,
      };

      const category = args.category || "General";
      const priority = args.priority || "medium";

      let baseDays = baseDurations[category] || 3;
      baseDays *= priorityMultipliers[priority] || 1.0;

      // Add some randomness and complexity analysis
      const complexity = Math.min(args.taskText.length / 50, 2); // Simple complexity measure
      baseDays *= (1 + complexity * 0.3);

      // Round to reasonable values
      const suggestedDays = Math.max(1, Math.round(baseDays));
      const suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + suggestedDays);

      return {
        deadline: suggestedDate.toISOString().split('T')[0],
        confidence: Math.max(0.5, 0.9 - complexity * 0.2),
        reasoning: `Based on ${category.toLowerCase()} tasks with ${priority} priority`,
        alternatives: [
          {
            deadline: new Date(suggestedDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            label: "Aggressive"
          },
          {
            deadline: new Date(suggestedDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            label: "Conservative"
          }
        ]
      };
    } catch (error) {
      console.error("Error suggesting deadline:", error);
      throw new Error("Failed to suggest deadline");
    }
  },
});

// Find similar tasks
export const findSimilarTasks = action({
  args: {
    taskText: v.string(),
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // In a real implementation, this would use vector similarity
      // or more sophisticated text matching algorithms

      const limit = args.limit || 5;

      // Simple keyword-based similarity for demonstration
      const keywords = args.taskText.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 5);

      // Placeholder for similar tasks
      const similarTasks = [
        {
          id: "similar_1",
          text: "Similar task example 1",
          similarity: 0.85,
          category: "Development",
          completedIn: 3, // days
        },
        {
          id: "similar_2",
          text: "Similar task example 2",
          similarity: 0.72,
          category: "Development",
          completedIn: 5, // days
        }
      ];

      return {
        similar_tasks: similarTasks.slice(0, limit),
        insights: {
          average_completion_time: 4,
          common_category: "Development",
          success_rate: 0.8
        }
      };
    } catch (error) {
      console.error("Error finding similar tasks:", error);
      throw new Error("Failed to find similar tasks");
    }
  },
});
