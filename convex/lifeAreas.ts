import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("lifeAreas").collect();
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("lifeAreas")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    targetPercentage: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("lifeAreas", {
      name: args.name,
      icon: args.icon,
      color: args.color,
      targetPercentage: args.targetPercentage,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("lifeAreas"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    targetPercentage: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const updateData: any = {};

    if (rest.name !== undefined) updateData.name = rest.name;
    if (rest.icon !== undefined) updateData.icon = rest.icon;
    if (rest.color !== undefined) updateData.color = rest.color;
    if (rest.targetPercentage !== undefined) updateData.targetPercentage = rest.targetPercentage;
    if (rest.isActive !== undefined) updateData.isActive = rest.isActive;

    return await ctx.db.patch(id, updateData);
  },
});

export const remove = mutation({
  args: {
    id: v.id("lifeAreas"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

export const initializeDefaultLifeAreas = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("lifeAreas").collect();
    if (existing.length > 0) {
      return { message: "Life areas already initialized" };
    }

    const defaultAreas = [
      { name: "Career", icon: "💼", color: "#1976d2", targetPercentage: 25 },
      { name: "Health", icon: "💪", color: "#4caf50", targetPercentage: 25 },
      { name: "Learning", icon: "📚", color: "#ff9800", targetPercentage: 20 },
      { name: "Relationships", icon: "❤️", color: "#e91e63", targetPercentage: 15 },
      { name: "Creativity", icon: "🎨", color: "#9c27b0", targetPercentage: 15 },
    ];

    const created = [];
    for (const area of defaultAreas) {
      const id = await ctx.db.insert("lifeAreas", {
        name: area.name,
        icon: area.icon,
        color: area.color,
        targetPercentage: area.targetPercentage,
        isActive: true,
        createdAt: Date.now(),
      });
      created.push(id);
    }

    return { created: created.length, areas: defaultAreas };
  },
});
