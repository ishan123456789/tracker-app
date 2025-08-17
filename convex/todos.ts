import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("todos").collect();
  },
});

export const add = mutation({
  args: {
    text: v.string(),
    deadline: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db.query("todos").collect();
    const newPosition = todos.length > 0 ? Math.max(...todos.map(t => t.position || 0)) + 1 : 1;
    await ctx.db.insert("todos", { 
      text: args.text, 
      done: false, 
      deadline: args.deadline, 
      position: newPosition 
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("todos"),
    done: v.optional(v.boolean()),
    deadline: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    if (rest.done !== undefined) {
      rest.doneAt = rest.done ? Date.now() : undefined;
    }
    await ctx.db.patch(id, rest);
  },
});

export const updateOrder = mutation({
  args: {
    todos: v.array(v.object({_id: v.id("todos"), position: v.number()})),
  },
  handler: async (ctx, args) => {
    for (const todo of args.todos) {
      await ctx.db.patch(todo._id, { position: todo.position });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const removeOldDone = mutation({
  args: {},
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const oldDoneTodos = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("done"), true))
      .filter((q) => q.lt(q.field("doneAt"), oneDayAgo))
      .collect();

    for (const todo of oldDoneTodos) {
      await ctx.db.delete(todo._id);
    }
  },
});
