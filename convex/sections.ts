import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all sections for the current user/workspace
export const list = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    if (args.workspaceId) {
      return await ctx.db
        .query("sections")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", args.workspaceId)
        )
        .collect();
    } else {
      // Get user's personal sections
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();

      if (!user) {
        return [];
      }

      return await ctx.db
        .query("sections")
        .withIndex("by_owner", (q) =>
          q.eq("ownerId", user._id)
        )
        .collect();
    }
  },
});

// Get a specific section by ID
export const getById = query({
  args: {
    id: v.id("sections"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new section
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
    columns: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
        options: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.insert("sections", {
      title: args.title,
      description: args.description,
      workspaceId: args.workspaceId,
      ownerId: user._id,
      columns: args.columns,
      rows: [],
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Update a section
export const update = mutation({
  args: {
    id: v.id("sections"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    columns: v.optional(
      v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          options: v.optional(v.array(v.string())),
        })
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;

    const section = await ctx.db.get(id);
    if (!section) {
      throw new Error("Section not found");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || (section.ownerId !== user._id)) {
      throw new Error("Not authorized to update this section");
    }

    await ctx.db.patch(id, {
      ...updateData,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Delete a section
export const remove = mutation({
  args: {
    id: v.id("sections"),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.id);
    if (!section) {
      throw new Error("Section not found");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || (section.ownerId !== user._id)) {
      throw new Error("Not authorized to delete this section");
    }

    await ctx.db.delete(args.id);
  },
});

// Add a row to a section
export const addRow = mutation({
  args: {
    sectionId: v.id("sections"),
    row: v.any(),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new Error("Section not found");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || (section.ownerId !== user._id)) {
      throw new Error("Not authorized to modify this section");
    }

    const rows = section.rows || [];
    rows.push(args.row);

    await ctx.db.patch(args.sectionId, {
      rows,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.sectionId);
  },
});

// Update a row in a section
export const updateRow = mutation({
  args: {
    sectionId: v.id("sections"),
    rowIndex: v.number(),
    row: v.any(),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new Error("Section not found");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || (section.ownerId !== user._id)) {
      throw new Error("Not authorized to modify this section");
    }

    const rows = section.rows || [];
    if (args.rowIndex < 0 || args.rowIndex >= rows.length) {
      throw new Error("Invalid row index");
    }

    rows[args.rowIndex] = args.row;

    await ctx.db.patch(args.sectionId, {
      rows,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.sectionId);
  },
});

// Delete a row from a section
export const deleteRow = mutation({
  args: {
    sectionId: v.id("sections"),
    rowIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new Error("Section not found");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || (section.ownerId !== user._id)) {
      throw new Error("Not authorized to modify this section");
    }

    const rows = section.rows || [];
    if (args.rowIndex < 0 || args.rowIndex >= rows.length) {
      throw new Error("Invalid row index");
    }

    rows.splice(args.rowIndex, 1);

    await ctx.db.patch(args.sectionId, {
      rows,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.sectionId);
  },
});
