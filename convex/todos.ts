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
    // User-logged numeric metrics
    countLabel: v.optional(v.string()),
    count: v.optional(v.number()),
    timeSpentMinutes: v.optional(v.number()),
    distance: v.optional(v.number()),
    distanceUnit: v.optional(v.string()),
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
      // User-logged numeric metrics
      countLabel: args.countLabel,
      count: args.count,
      timeSpentMinutes: args.timeSpentMinutes,
      distance: args.distance,
      distanceUnit: args.distanceUnit,
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
    deadline: v.optional(v.union(v.string(), v.null())),
    dueTime: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    // Hierarchical category fields
    mainCategory: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    activityType: v.optional(v.string()),
    // Legacy category field for backward compatibility
    category: v.optional(v.string()),
    text: v.optional(v.string()),
    notes: v.optional(v.union(v.string(), v.null())),
    tags: v.optional(v.union(v.array(v.string()), v.null())),
    estimatedMinutes: v.optional(v.float64()),
    isRecurring: v.optional(v.boolean()),
    recurringPattern: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("custom"))),
    recurringInterval: v.optional(v.float64()),
    recurringDays: v.optional(v.array(v.float64())),
    // User-logged numeric metrics
    countLabel: v.optional(v.union(v.string(), v.null())),
    count: v.optional(v.union(v.float64(), v.null())),
    timeSpentMinutes: v.optional(v.union(v.float64(), v.null())),
    distance: v.optional(v.union(v.float64(), v.null())),
    distanceUnit: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;

    // Filter out system fields that shouldn't be updated
    const allowedFields = [
      'done', 'deadline', 'dueTime', 'priority', 'mainCategory', 'subcategory',
      'activityType', 'category', 'text', 'notes', 'tags', 'estimatedMinutes',
      'isRecurring', 'recurringPattern', 'recurringInterval', 'recurringDays',
      'countLabel', 'count', 'timeSpentMinutes', 'distance', 'distanceUnit',
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
    completeAll: v.optional(v.boolean()),
    // Metric values logged at completion time
    count: v.optional(v.number()),
    timeSpentMinutes: v.optional(v.number()),
    distance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) return;

    const today = new Date().toISOString().split("T")[0];

    // ── Streak calculation ──────────────────────────────────────────────────
    // The root todo holds the canonical streak/stats. Find it.
    // If parentRecurringId points to a deleted document, fall back to the current todo.
    const rawRootId = todo.parentRecurringId ?? args.id;
    const rawRootTodo = rawRootId === args.id ? todo : await ctx.db.get(rawRootId);

    // Guard: if the root document was deleted, treat the current todo as the new root.
    // Also clear the stale parentRecurringId so future instances don't keep pointing
    // to the deleted document.
    const rootIsOrphaned = !rawRootTodo && rawRootId !== args.id;
    if (rootIsOrphaned) {
      await ctx.db.patch(args.id, { parentRecurringId: undefined });
    }
    const rootId = rawRootTodo ? rawRootId : args.id;
    const rootTodo = rawRootTodo ?? todo;

    let currentStreak = rootTodo.currentStreak || 0;
    let longestStreak = rootTodo.longestStreak || 0;
    const totalCompleted = (rootTodo.totalCompleted || 0) + 1;
    const lastCompletedDate = rootTodo.lastCompletedDate;

    // Determine if the streak continues or resets.
    // A streak continues if the last completion was on the previous valid occurrence date.
    // For simplicity: if lastCompletedDate was yesterday (daily) or within the expected
    // interval, continue the streak; otherwise start fresh at 1.
    if (lastCompletedDate) {
      const last = new Date(lastCompletedDate + "T00:00:00.000Z");
      const todayDate = new Date(today + "T00:00:00.000Z");
      const diffDays = Math.round((todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

      // Determine expected gap based on pattern
      let expectedGap = 1;
      if (todo.recurringPattern === "weekly") expectedGap = 7;
      else if (todo.recurringPattern === "monthly") expectedGap = 28; // approximate
      else if (todo.recurringPattern === "custom") expectedGap = todo.recurringInterval || 1;

      // Allow a small tolerance (same day or expected gap)
      if (diffDays <= expectedGap + 1) {
        currentStreak += 1;
      } else {
        // Streak broken — reset to 1
        currentStreak = 1;
      }
    } else {
      // First ever completion
      currentStreak = 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    // ── Metric aggregation ──────────────────────────────────────────────────
    // Read current values from the todo instance (saved by user before completing)
    const completedCount = args.count ?? todo.count ?? 0;
    const completedTime = args.timeSpentMinutes ?? todo.timeSpentMinutes ?? 0;
    const completedDistance = args.distance ?? todo.distance ?? 0;

    // Accumulate lifetime totals
    const newTotalCount = (rootTodo.totalCount || 0) + completedCount;
    const newTotalTimeMinutes = (rootTodo.totalTimeMinutes || 0) + completedTime;
    const newTotalDistance = (rootTodo.totalDistance || 0) + completedDistance;

    // Today's values: reset if it's a new day
    const lastMetricDate = rootTodo.lastMetricDate;
    let newTodayCount: number;
    let newTodayTimeMinutes: number;
    let newTodayDistance: number;

    if (lastMetricDate === today) {
      // Same day — accumulate
      newTodayCount = (rootTodo.todayCount || 0) + completedCount;
      newTodayTimeMinutes = (rootTodo.todayTimeMinutes || 0) + completedTime;
      newTodayDistance = (rootTodo.todayDistance || 0) + completedDistance;
    } else {
      // New day — reset to current completion values
      newTodayCount = completedCount;
      newTodayTimeMinutes = completedTime;
      newTodayDistance = completedDistance;
    }

    // Update the root todo with new streak stats + metric aggregates
    await ctx.db.patch(rootId, {
      currentStreak,
      longestStreak,
      totalCompleted,
      lastCompletedDate: today,
      totalCount: newTotalCount,
      totalTimeMinutes: newTotalTimeMinutes,
      totalDistance: newTotalDistance,
      todayCount: newTodayCount,
      todayTimeMinutes: newTodayTimeMinutes,
      todayDistance: newTodayDistance,
      lastMetricDate: today,
    });

    // Mark current instance as done
    await ctx.db.patch(args.id, {
      done: true,
      doneAt: Date.now(),
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

    // Clean up any stale undone sibling instances with past deadlines.
    // These accumulate when the user had to click multiple times before the
    // calculateNextDueDate fix was deployed. Deleting them prevents the
    // "multiple clicks to reach today" problem for existing DB data.
    const todayStr = new Date().toISOString().split("T")[0];
    const staleSiblings = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("parentRecurringId"), rootId))
      .collect();
    for (const sibling of staleSiblings) {
      if (
        !sibling.done &&
        sibling._id !== args.id &&
        sibling.deadline &&
        sibling.deadline < todayStr
      ) {
        await ctx.db.delete(sibling._id);
      }
    }

    // Create next instance, carrying streak stats + metric aggregates + labels forward
    const nextDate = calculateNextDueDate(todo);
    if (nextDate) {
      await ctx.db.insert("todos", {
        text: todo.text,
        done: false,
        deadline: nextDate,
        dueTime: todo.dueTime,
        priority: todo.priority,
        // Hierarchical category fields
        mainCategory: todo.mainCategory,
        subcategory: todo.subcategory,
        activityType: todo.activityType,
        // Legacy category field for backward compatibility
        category: todo.category,
        estimatedMinutes: todo.estimatedMinutes,
        notes: todo.notes,
        tags: todo.tags,
        isRecurring: true,
        recurringPattern: todo.recurringPattern,
        recurringInterval: todo.recurringInterval,
        recurringDays: todo.recurringDays,
        parentRecurringId: rootId,
        recurringStartDate: rootTodo?.recurringStartDate || todo.deadline,
        // Propagate streak stats so they're visible on the next instance too
        currentStreak,
        longestStreak,
        totalCompleted,
        totalMissed: rootTodo?.totalMissed || todo.totalMissed || 0,
        lastCompletedDate: today,
        actualMinutes: 0,
        timerSessions: [],
        position: (await getMaxPosition(ctx)) + 1,
        // Propagate metric labels (set once, carry forward forever)
        countLabel: todo.countLabel,
        distanceUnit: todo.distanceUnit,
        // Propagate metric aggregates for display on next instance
        totalCount: newTotalCount,
        totalTimeMinutes: newTotalTimeMinutes,
        totalDistance: newTotalDistance,
        todayCount: newTodayCount,
        todayTimeMinutes: newTodayTimeMinutes,
        todayDistance: newTodayDistance,
        lastMetricDate: today,
        // Reset per-completion values (user logs fresh each time)
        count: undefined,
        timeSpentMinutes: undefined,
        distance: undefined,
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

  // Start from the current deadline (or today if no deadline set)
  const cursor = todo.deadline ? new Date(todo.deadline + "T00:00:00.000Z") : new Date();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Advance one step at a time until we land on a date >= today.
  // This handles the case where the deadline is days/weeks in the past —
  // we skip all the missed occurrences and land directly on the next future date.
  let safety = 0;
  do {
    switch (todo.recurringPattern) {
      case "daily":
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        break;
      case "weekly": {
        const days: number[] = todo.recurringDays || [];
        if (days.length === 0) {
          cursor.setUTCDate(cursor.getUTCDate() + 7);
        } else {
          // Find the next scheduled day-of-week after cursor
          const cursorDow = cursor.getUTCDay();
          const sortedDays = [...days].sort((a, b) => a - b);
          const nextThisWeek = sortedDays.find((d) => d > cursorDow);
          if (nextThisWeek !== undefined) {
            cursor.setUTCDate(cursor.getUTCDate() + (nextThisWeek - cursorDow));
          } else {
            // Wrap to next week
            cursor.setUTCDate(cursor.getUTCDate() + (7 - cursorDow + sortedDays[0]));
          }
        }
        break;
      }
      case "monthly":
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        break;
      case "custom":
        cursor.setUTCDate(cursor.getUTCDate() + (todo.recurringInterval || 1));
        break;
      default:
        return null;
    }
    safety++;
  } while (cursor < today && safety < 400);

  return cursor.toISOString().split('T')[0];
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
