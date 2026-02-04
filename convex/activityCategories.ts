import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all activity category mappings
export const getMappings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("activityCategoryMappings")
      .order("desc")
      .collect();
  },
});

// Get mappings by category (legacy)
export const getMappingsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activityCategoryMappings")
      .withIndex("by_todo_category", (q) => q.eq("todoCategory", args.category))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get mappings by hierarchical category
export const getMappingsByHierarchicalCategory = query({
  args: {
    mainCategory: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    activityType: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("activityCategoryMappings");

    // Apply filters based on provided hierarchical category fields
    const mappings = await query.collect();

    return mappings.filter(mapping => {
      if (!mapping.isActive) return false;

      // Check hierarchical category match
      if (args.mainCategory && mapping.mainCategory !== args.mainCategory) return false;
      if (args.subcategory && mapping.subcategory !== args.subcategory) return false;
      if (args.activityType && mapping.activityType !== args.activityType) return false;

      return true;
    });
  },
});

// Create a new activity category mapping
export const createMapping = mutation({
  args: {
    name: v.string(),
    todoCategory: v.string(),
    targetSectionId: v.id("sections"),
    columnMappings: v.array(v.object({
      metricType: v.string(),
      columnName: v.string(),
      defaultValue: v.optional(v.number()),
    })),
    extractionRules: v.array(v.object({
      pattern: v.string(),
      metricType: v.string(),
      unit: v.string(),
    })),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityCategoryMappings", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update an existing mapping
export const updateMapping = mutation({
  args: {
    id: v.id("activityCategoryMappings"),
    name: v.string(),
    todoCategory: v.string(),
    targetSectionId: v.id("sections"),
    columnMappings: v.array(v.object({
      metricType: v.string(),
      columnName: v.string(),
      defaultValue: v.optional(v.number()),
    })),
    extractionRules: v.array(v.object({
      pattern: v.string(),
      metricType: v.string(),
      unit: v.string(),
    })),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    return await ctx.db.patch(id, {
      ...updateData,
      updatedAt: Date.now(),
    });
  },
});

// Delete a mapping
export const deleteMapping = mutation({
  args: { id: v.id("activityCategoryMappings") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Toggle mapping active status
export const toggleMappingActive = mutation({
  args: {
    id: v.id("activityCategoryMappings"),
    isActive: v.boolean()
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
  },
});

// Get all activity category templates
export const getTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("activityCategoryTemplates")
      .order("desc")
      .collect();
  },
});

// Create a new template
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    sectionTemplate: v.object({
      title: v.string(),
      columns: v.array(v.object({
        name: v.string(),
        type: v.string(),
        options: v.optional(v.array(v.string())),
      })),
    }),
    defaultMappings: v.array(v.object({
      metricType: v.string(),
      columnName: v.string(),
    })),
    extractionRules: v.array(v.object({
      pattern: v.string(),
      metricType: v.string(),
      unit: v.string(),
    })),
    isBuiltIn: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityCategoryTemplates", {
      ...args,
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

// Get metric extraction rules
export const getExtractionRules = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category && typeof args.category === 'string') {
      return await ctx.db
        .query("metricExtractionRules")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("metricExtractionRules")
      .order("desc")
      .collect();
  },
});

// Create extraction rule
export const createExtractionRule = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    patterns: v.array(v.object({
      regex: v.string(),
      metricType: v.string(),
      unit: v.string(),
      multiplier: v.optional(v.number()),
    })),
    priority: v.number(),
    isGlobal: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("metricExtractionRules", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Auto-track todo completion to activity section
export const autoTrackTodoCompletion = mutation({
  args: {
    todoId: v.id("todos"),
    sectionId: v.id("sections"),
    entry: v.any(),
    mappingId: v.id("activityCategoryMappings"),
  },
  handler: async (ctx, args) => {
    // Get the target section
    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new Error("Target section not found");
    }

    // Add the new entry to the section
    const updatedEntries = [...section.entries, args.entry];

    // Update the section with the new entry
    await ctx.db.patch(args.sectionId, {
      entries: updatedEntries,
      updatedAt: Date.now(),
    });

    // Update the todo to mark it as auto-tracked
    await ctx.db.patch(args.todoId, {
      autoTrackSection: args.sectionId,
      updatedAt: Date.now(),
    });

    return { success: true, entryIndex: updatedEntries.length - 1 };
  },
});

// Get auto-tracking preview data
export const getAutoTrackingPreview = query({
  args: {
    todoCategory: v.string(),
    extractedMetrics: v.any(),
  },
  handler: async (ctx, args) => {
    // Find active mappings for this category
    const mappings = await ctx.db
      .query("activityCategoryMappings")
      .withIndex("by_todo_category", (q) => q.eq("todoCategory", args.todoCategory))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (mappings.length === 0) {
      return null;
    }

    const mapping = mappings[0]; // Use first active mapping

    // Get the target section
    const section = await ctx.db.get(mapping.targetSectionId);
    if (!section) {
      return null;
    }

    // Generate preview entry
    const previewEntry: any = {
      Date: new Date().toISOString().split('T')[0],
    };

    // Map extracted metrics to section columns
    mapping.columnMappings.forEach(columnMapping => {
      const metricValue = args.extractedMetrics.metrics?.find(
        (m: any) => m.type === columnMapping.metricType
      )?.value;

      if (metricValue !== undefined) {
        previewEntry[columnMapping.columnName] = metricValue;
      } else if (columnMapping.defaultValue !== undefined) {
        previewEntry[columnMapping.columnName] = columnMapping.defaultValue;
      }
    });

    return {
      mapping,
      section,
      previewEntry,
      confidence: args.extractedMetrics.confidence || 0.8,
    };
  },
});

// Bulk create default templates
export const createDefaultTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const defaultTemplates = [
      {
        name: "Chess Training",
        description: "Track chess puzzles, games, and practice sessions",
        category: "chess",
        sectionTemplate: {
          title: "Chess Progress",
          columns: [
            { name: "Date", type: "date" },
            { name: "Puzzles Solved", type: "number" },
            { name: "Games Played", type: "number" },
            { name: "Games Won", type: "number" },
            { name: "Time Spent", type: "number" },
            { name: "Notes", type: "text" }
          ]
        },
        defaultMappings: [
          { metricType: "puzzles", columnName: "Puzzles Solved" },
          { metricType: "games", columnName: "Games Played" },
          { metricType: "games_won", columnName: "Games Won" },
          { metricType: "minutes", columnName: "Time Spent" }
        ],
        extractionRules: [
          { pattern: "(\\d+)\\s*(?:chess\\s*)?puzzles?", metricType: "puzzles", unit: "puzzles" },
          { pattern: "(\\d+)\\s*(?:chess\\s*)?games?", metricType: "games", unit: "games" },
          { pattern: "won\\s*(\\d+)\\s*games?", metricType: "games_won", unit: "games" },
          { pattern: "(\\d+)\\s*(?:minutes?|mins?)", metricType: "minutes", unit: "minutes" }
        ],
        isBuiltIn: true
      },
      {
        name: "Basketball Practice",
        description: "Track shooting practice and game performance",
        category: "basketball",
        sectionTemplate: {
          title: "Basketball Stats",
          columns: [
            { name: "Date", type: "date" },
            { name: "Shots Taken", type: "number" },
            { name: "Shots Made", type: "number" },
            { name: "Free Throws", type: "number" },
            { name: "Practice Time", type: "number" },
            { name: "Notes", type: "text" }
          ]
        },
        defaultMappings: [
          { metricType: "shots", columnName: "Shots Taken" },
          { metricType: "baskets", columnName: "Shots Made" },
          { metricType: "free_throws", columnName: "Free Throws" },
          { metricType: "minutes", columnName: "Practice Time" }
        ],
        extractionRules: [
          { pattern: "(\\d+)\\s*shots?", metricType: "shots", unit: "shots" },
          { pattern: "(\\d+)\\s*baskets?", metricType: "baskets", unit: "baskets" },
          { pattern: "(\\d+)\\s*(?:free\\s*)?throws?", metricType: "free_throws", unit: "shots" },
          { pattern: "(\\d+)\\s*(?:minutes?|mins?)", metricType: "minutes", unit: "minutes" }
        ],
        isBuiltIn: true
      }
    ];

    const results = [];
    for (const template of defaultTemplates) {
      const id = await ctx.db.insert("activityCategoryTemplates", {
        ...template,
        usageCount: 0,
        createdAt: Date.now(),
      });
      results.push(id);
    }

    return results;
  },
});
