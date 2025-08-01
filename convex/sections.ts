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
    columns: v.array(v.object({ name: v.string(), type: v.string() })),
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
    columns: v.array(v.object({ name: v.string(), type: v.string() })),
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
