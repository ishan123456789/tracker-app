import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sections").collect();
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    columns: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
        options: v.optional(v.array(v.string())),
        allowMultiple: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { title, columns } = args;
    await ctx.db.insert("sections", { title, columns, entries: [] });
  },
});

export const update = mutation({
  args: {
    id: v.id("sections"),
    title: v.string(),
    columns: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
        options: v.optional(v.array(v.string())),
        allowMultiple: v.optional(v.boolean()),
      })
    ),
    entries: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.replace(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("sections") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Add entry to section (for auto-tracking)
export const addEntry = mutation({
  args: {
    id: v.id("sections"),
    entry: v.any(),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.id);
    if (!section) {
      throw new Error("Section not found");
    }

    const updatedEntries = [...section.entries, args.entry];

    await ctx.db.patch(args.id, {
      entries: updatedEntries,
      updatedAt: Date.now(),
    });

    return { success: true, entryIndex: updatedEntries.length - 1 };
  },
});

// Get section by ID
export const getById = query({
  args: { id: v.id("sections") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// List sections (alias for get)
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sections").collect();
  },
});

// Create section from template
export const createFromTemplate = mutation({
  args: {
    title: v.string(),
    columns: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
        options: v.optional(v.array(v.string())),
        allowMultiple: v.optional(v.boolean()),
      })
    ),
    templateId: v.optional(v.id("activityCategoryTemplates")),
  },
  handler: async (ctx, args) => {
    const { templateId, ...sectionData } = args;

    const sectionId = await ctx.db.insert("sections", {
      ...sectionData,
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // If created from template, increment usage count
    if (templateId) {
      const template = await ctx.db.get(templateId);
      if (template) {
        await ctx.db.patch(templateId, {
          usageCount: (template.usageCount || 0) + 1,
        });
      }
    }

    return sectionId;
  },
});

// Update entry in section
export const updateEntry = mutation({
  args: {
    id: v.id("sections"),
    entryIndex: v.number(),
    entry: v.any(),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.id);
    if (!section) {
      throw new Error("Section not found");
    }

    if (args.entryIndex < 0 || args.entryIndex >= section.entries.length) {
      throw new Error("Invalid entry index");
    }

    const updatedEntries = [...section.entries];
    updatedEntries[args.entryIndex] = args.entry;

    await ctx.db.patch(args.id, {
      entries: updatedEntries,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete entry from section
export const deleteEntry = mutation({
  args: {
    id: v.id("sections"),
    entryIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.id);
    if (!section) {
      throw new Error("Section not found");
    }

    if (args.entryIndex < 0 || args.entryIndex >= section.entries.length) {
      throw new Error("Invalid entry index");
    }

    const updatedEntries = section.entries.filter((_, index) => index !== args.entryIndex);

    await ctx.db.patch(args.id, {
      entries: updatedEntries,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
