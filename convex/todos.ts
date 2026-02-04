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
    dueTime: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    // Hierarchical category fields
    mainCategory: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    activityType: v.optional(v.string()),
    // Legacy category field for backward compatibility
    category: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    parentId: v.optional(v.id("todos")),
    isRecurring: v.optional(v.boolean()),
    recurringPattern: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("custom"))),
    recurringInterval: v.optional(v.number()),
    recurringDays: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db.query("todos").collect();
    const newPosition = todos.length > 0 ? Math.max(...todos.map(t => t.position || 0)) + 1 : 1;

    const newTodo = await ctx.db.insert("todos", {
      text: args.text,
      done: false,
      deadline: args.deadline,
      dueTime: args.dueTime,
      priority: args.priority || "medium",
      // Hierarchical category fields
      mainCategory: args.mainCategory,
      subcategory: args.subcategory,
      activityType: args.activityType,
      // Legacy category field for backward compatibility
      category: args.category,
      position: newPosition,
      estimatedMinutes: args.estimatedMinutes,
      notes: args.notes,
      tags: args.tags,
      parentId: args.parentId,
      isRecurring: args.isRecurring,
      recurringPattern: args.recurringPattern,
      recurringInterval: args.recurringInterval,
      recurringDays: args.recurringDays,
      actualMinutes: 0,
      timerSessions: [],
    });

    // If this is a subtask, update parent's subtasks array
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (parent) {
        const subtasks = parent.subtasks || [];
        await ctx.db.patch(args.parentId, { subtasks: [...subtasks, newTodo] });
      }
    }

    return newTodo;
  },
});

export const update = mutation({
  args: {
    id: v.id("todos"),
    done: v.optional(v.boolean()),
    deadline: v.optional(v.string()),
    dueTime: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    // Hierarchical category fields
    mainCategory: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    activityType: v.optional(v.string()),
    // Legacy category field for backward compatibility
    category: v.optional(v.string()),
    text: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    estimatedMinutes: v.optional(v.number()),
    isRecurring: v.optional(v.boolean()),
    recurringPattern: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("custom"))),
    recurringInterval: v.optional(v.number()),
    recurringDays: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;

    // Filter out system fields that shouldn't be updated
    const allowedFields = [
      'done', 'deadline', 'dueTime', 'priority', 'mainCategory', 'subcategory',
      'activityType', 'category', 'text', 'notes', 'tags', 'estimatedMinutes',
      'isRecurring', 'recurringPattern', 'recurringInterval', 'recurringDays'
    ];

    const updateData: any = {};
    for (const [key, value] of Object.entries(rest)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    if (updateData.done !== undefined) {
      updateData.doneAt = updateData.done ? Date.now() : undefined;
    }

    await ctx.db.patch(id, updateData);
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
    // Check if the document exists before trying to delete it
    const todo = await ctx.db.get(args.id);
    if (todo) {
      await ctx.db.delete(args.id);
    }
    // If the document doesn't exist, silently succeed (idempotent operation)
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

// Time tracking mutations
export const startTimer = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { timerStarted: Date.now() });
  },
});

export const stopTimer = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo || !todo.timerStarted) return;

    const endTime = Date.now();
    const duration = Math.round((endTime - todo.timerStarted) / 1000 / 60); // minutes
    const sessions = todo.timerSessions || [];
    const newSession = {
      startTime: todo.timerStarted,
      endTime,
      duration
    };

    await ctx.db.patch(args.id, {
      timerStarted: undefined,
      actualMinutes: (todo.actualMinutes || 0) + duration,
      timerSessions: [...sessions, newSession]
    });
  },
});

export const updateTimeEstimate = mutation({
  args: {
    id: v.id("todos"),
    estimatedMinutes: v.number()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { estimatedMinutes: args.estimatedMinutes });
  },
});

// Recurring task mutations
export const completeRecurringTask = mutation({
  args: {
    id: v.id("todos"),
    skipNext: v.optional(v.boolean()),
    completeAll: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) return;

    // Mark current instance as done
    await ctx.db.patch(args.id, {
      done: true,
      doneAt: Date.now()
    });

    if (args.completeAll) {
      // Complete all future instances
      const recurringTodos = await ctx.db
        .query("todos")
        .filter((q) => q.eq(q.field("parentRecurringId"), todo.parentRecurringId || args.id))
        .collect();

      for (const recurringTodo of recurringTodos) {
        await ctx.db.patch(recurringTodo._id, { done: true, doneAt: Date.now() });
      }
      return;
    }

    if (args.skipNext || !todo.isRecurring) return;

    // Create next instance
    const nextDate = calculateNextDueDate(todo);
    if (nextDate) {
      await ctx.db.insert("todos", {
        text: todo.text,
        done: false,
        deadline: nextDate,
        dueTime: todo.dueTime,
        priority: todo.priority,
        category: todo.category,
        estimatedMinutes: todo.estimatedMinutes,
        notes: todo.notes,
        tags: todo.tags,
        isRecurring: true,
        recurringPattern: todo.recurringPattern,
        recurringInterval: todo.recurringInterval,
        recurringDays: todo.recurringDays,
        parentRecurringId: todo.parentRecurringId || args.id,
        actualMinutes: 0,
        timerSessions: [],
        position: (await getMaxPosition(ctx)) + 1
      });
    }
  },
});

// Template mutations
export const createTemplate = mutation({
  args: {
    name: v.string(),
    text: v.string(),
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    category: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("todoTemplates", args);
  },
});

export const getTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("todoTemplates").collect();
  },
});

export const createFromTemplate = mutation({
  args: {
    templateId: v.id("todoTemplates"),
    deadline: v.optional(v.string()),
    dueTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return;

    const todos = await ctx.db.query("todos").collect();
    const newPosition = todos.length > 0 ? Math.max(...todos.map(t => t.position || 0)) + 1 : 1;

    await ctx.db.insert("todos", {
      text: template.text,
      done: false,
      deadline: args.deadline,
      dueTime: args.dueTime,
      priority: template.priority || "medium",
      category: template.category,
      estimatedMinutes: template.estimatedMinutes,
      notes: template.notes,
      tags: template.tags,
      position: newPosition,
      actualMinutes: 0,
      timerSessions: [],
    });
  },
});

// Subtask mutations
export const addSubtask = mutation({
  args: {
    parentId: v.id("todos"),
    text: v.string(),
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
  },
  handler: async (ctx, args) => {
    const parent = await ctx.db.get(args.parentId);
    if (!parent) return;

    const newSubtask = await ctx.db.insert("todos", {
      text: args.text,
      done: false,
      priority: args.priority || "medium",
      parentId: args.parentId,
      position: 0, // Subtasks don't need global positioning
      actualMinutes: 0,
      timerSessions: [],
    });

    const subtasks = parent.subtasks || [];
    await ctx.db.patch(args.parentId, { subtasks: [...subtasks, newSubtask] });

    return newSubtask;
  },
});

export const getSubtasks = query({
  args: { parentId: v.id("todos") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("parentId"), args.parentId))
      .collect();
  },
});

// Bulk operations
export const bulkComplete = mutation({
  args: { ids: v.array(v.id("todos")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.patch(id, { done: true, doneAt: Date.now() });
    }
  },
});

export const bulkDelete = mutation({
  args: { ids: v.array(v.id("todos")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});

export const duplicateTodo = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) return;

    const { _id, _creationTime, done, doneAt, timerStarted, actualMinutes, timerSessions, ...todoData } = todo;
    const newPosition = (await getMaxPosition(ctx)) + 1;

    await ctx.db.insert("todos", {
      ...todoData,
      text: `${todo.text} (Copy)`,
      done: false,
      position: newPosition,
      actualMinutes: 0,
      timerSessions: [],
    });
  },
});

// Helper functions
async function getMaxPosition(ctx: any): Promise<number> {
  const todos = await ctx.db.query("todos").collect();
  return todos.length > 0 ? Math.max(...todos.map((t: any) => t.position || 0)) : 0;
}

function calculateNextDueDate(todo: any): string | null {
  if (!todo.recurringPattern) return null;

  // Use deadline if available, otherwise use current date
  const currentDate = todo.deadline ? new Date(todo.deadline) : new Date();

  switch (todo.recurringPattern) {
    case "daily":
      currentDate.setDate(currentDate.getDate() + 1);
      break;
    case "weekly":
      currentDate.setDate(currentDate.getDate() + 7);
      break;
    case "monthly":
      currentDate.setMonth(currentDate.getMonth() + 1);
      break;
    case "custom":
      if (todo.recurringInterval) {
        currentDate.setDate(currentDate.getDate() + todo.recurringInterval);
      }
      break;
    default:
      return null;
  }

  return currentDate.toISOString().split('T')[0];
}

// Auto-tracking mutation for completing todos with activity tracking
export const completeWithAutoTracking = mutation({
  args: {
    id: v.id("todos"),
    sectionId: v.id("sections"),
    entry: v.any(),
    mappingId: v.id("activityCategoryMappings"),
  },
  handler: async (ctx, args) => {
    // Get the todo
    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    // Mark todo as completed
    await ctx.db.patch(args.id, {
      done: true,
      doneAt: Date.now(),
      autoTrackSection: args.sectionId,
      updatedAt: Date.now(),
    });

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

    return {
      success: true,
      entryIndex: updatedEntries.length - 1,
      todoId: args.id,
      sectionId: args.sectionId
    };
  },
});

// Get auto-tracking preview for a todo
export const getAutoTrackingPreview = query({
  args: {
    todoId: v.id("todos"),
    extractedMetrics: v.any(),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId);
    if (!todo || !todo.category) {
      return null;
    }

    // Find active mappings for this category
    const mappings = await ctx.db
      .query("activityCategoryMappings")
      .withIndex("by_todo_category", (q) => q.eq("todoCategory", todo.category))
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

    // Add todo reference
    previewEntry['Todo'] = todo.text;

    return {
      mapping,
      section,
      previewEntry,
      confidence: args.extractedMetrics.confidence || 0.8,
    };
  },
});
