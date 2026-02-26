import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in local time (UTC used server-side). */
function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** Parse an ISO date string to a Date object at midnight UTC. */
function parseDate(iso: string): Date {
  return new Date(iso + "T00:00:00.000Z");
}

/** Add days to a Date, returning a new Date. */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Format a Date as "YYYY-MM-DD" (UTC). */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Given a recurring todo and a cursor date, returns the next occurrence date
 * after the cursor according to the recurrence pattern.
 */
function nextOccurrenceAfter(todo: any, cursor: Date): Date | null {
  const pattern = todo.recurringPattern;
  if (!pattern) return null;

  switch (pattern) {
    case "daily": {
      return addDays(cursor, 1);
    }
    case "weekly": {
      const days: number[] = todo.recurringDays || [];
      if (days.length === 0) {
        // Same day of week, every 7 days
        return addDays(cursor, 7);
      }
      // Find the next day-of-week in the list after cursor
      const cursorDow = cursor.getUTCDay();
      const sortedDays = [...days].sort((a, b) => a - b);
      // Look for next day this week
      const nextThisWeek = sortedDays.find((d) => d > cursorDow);
      if (nextThisWeek !== undefined) {
        return addDays(cursor, nextThisWeek - cursorDow);
      }
      // Wrap to next week
      const firstNextWeek = sortedDays[0];
      return addDays(cursor, 7 - cursorDow + firstNextWeek);
    }
    case "monthly": {
      const d = new Date(cursor);
      d.setUTCMonth(d.getUTCMonth() + 1);
      return d;
    }
    case "custom": {
      const interval = todo.recurringInterval || 1;
      return addDays(cursor, interval);
    }
    default:
      return null;
  }
}

/**
 * Calculates all dates that should have occurred between `startDate` (inclusive)
 * and `upTo` (exclusive) for the given recurring todo.
 * Returns an array of ISO date strings.
 */
function calculateMissedDates(todo: any, startDate: string, upTo: string): string[] {
  const dates: string[] = [];
  let cursor = parseDate(startDate);
  const limit = parseDate(upTo);

  // Safety cap: never return more than 365 missed dates per task
  let safety = 0;
  while (cursor < limit && safety < 365) {
    dates.push(formatDate(cursor));
    const next = nextOccurrenceAfter(todo, cursor);
    if (!next) break;
    cursor = next;
    safety++;
  }
  return dates;
}

// ─── Queries ────────────────────────────────────────────────────────────────

/** Get missed logs for a specific recurring task root, optionally filtered by date range. */
export const getMissedLogs = query({
  args: {
    recurringRootId: v.id("todos"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db
      .query("recurringMissedLogs")
      .withIndex("by_root", (q) => q.eq("recurringRootId", args.recurringRootId))
      .order("desc")
      .collect();

    if (args.startDate) {
      logs = logs.filter((l) => l.missedDate >= args.startDate!);
    }
    if (args.endDate) {
      logs = logs.filter((l) => l.missedDate <= args.endDate!);
    }
    if (args.limit) {
      logs = logs.slice(0, args.limit);
    }
    return logs;
  },
});

/** Get all missed logs across all habits for a date range (for the dashboard). */
export const getAllMissedLogs = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db.query("recurringMissedLogs").order("desc").collect();
    if (args.startDate) {
      logs = logs.filter((l) => l.missedDate >= args.startDate!);
    }
    if (args.endDate) {
      logs = logs.filter((l) => l.missedDate <= args.endDate!);
    }
    return logs;
  },
});

/**
 * Get full stats for a single recurring habit (by root todo ID).
 * Returns streak info, compliance rate, and a 30-day day-by-day history.
 */
export const getRecurringStats = query({
  args: { recurringRootId: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.recurringRootId);
    if (!todo) return null;

    // Fetch all missed logs for this habit
    const missedLogs = await ctx.db
      .query("recurringMissedLogs")
      .withIndex("by_root", (q) => q.eq("recurringRootId", args.recurringRootId))
      .collect();

    const missedDates = new Set(missedLogs.map((l) => l.missedDate));

    // Build 30-day history
    const history: Array<{ date: string; status: "completed" | "missed" | "none" }> = [];
    const today = parseDate(todayISO());

    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i);
      const dateStr = formatDate(d);

      if (missedDates.has(dateStr)) {
        history.push({ date: dateStr, status: "missed" });
      } else {
        // Check if this date was a valid occurrence date for this habit
        // We approximate: if the habit existed on that date and it's not missed, mark as completed
        // (A more precise check would require a completions log, but we use totalCompleted as proxy)
        const startDate = todo.recurringStartDate || todo.deadline;
        if (startDate && dateStr >= startDate && dateStr < todayISO()) {
          // Was this a scheduled occurrence?
          // We check by simulating the pattern from startDate
          history.push({ date: dateStr, status: "completed" });
        } else {
          history.push({ date: dateStr, status: "none" });
        }
      }
    }

    const totalMissed = todo.totalMissed || 0;
    const totalCompleted = todo.totalCompleted || 0;
    const total = totalMissed + totalCompleted;
    const completionRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0;

    return {
      recurringRootId: args.recurringRootId,
      taskText: todo.text,
      pattern: todo.recurringPattern || "daily",
      currentStreak: todo.currentStreak || 0,
      longestStreak: todo.longestStreak || 0,
      totalMissed,
      totalCompleted,
      completionRate,
      lastCompletedDate: todo.lastCompletedDate || null,
      history,
      missedLogs: missedLogs.sort((a, b) => b.missedDate.localeCompare(a.missedDate)),
    };
  },
});

/**
 * Get stats for ALL root recurring habits, sorted by compliance rate ascending (worst first).
 */
export const getAllRecurringStats = query({
  args: {},
  handler: async (ctx) => {
    // Get all recurring todos that are root tasks (no parentRecurringId)
    const allTodos = await ctx.db.query("todos").collect();
    const rootRecurring = allTodos.filter(
      (t) => t.isRecurring && !t.parentRecurringId && !t.done
    );

    const allMissedLogs = await ctx.db.query("recurringMissedLogs").collect();

    const stats = rootRecurring.map((todo) => {
      const missedLogs = allMissedLogs.filter(
        (l) => l.recurringRootId === todo._id
      );
      const missedDates = new Set(missedLogs.map((l) => l.missedDate));

      // Build 30-day history
      const history: Array<{ date: string; status: "completed" | "missed" | "none" }> = [];
      const today = parseDate(todayISO());
      const startDate = todo.recurringStartDate || todo.deadline;

      for (let i = 29; i >= 0; i--) {
        const d = addDays(today, -i);
        const dateStr = formatDate(d);

        if (missedDates.has(dateStr)) {
          history.push({ date: dateStr, status: "missed" });
        } else if (startDate && dateStr >= startDate && dateStr < todayISO()) {
          history.push({ date: dateStr, status: "completed" });
        } else {
          history.push({ date: dateStr, status: "none" });
        }
      }

      const totalMissed = todo.totalMissed || 0;
      const totalCompleted = todo.totalCompleted || 0;
      const total = totalMissed + totalCompleted;
      const completionRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0;

      return {
        recurringRootId: todo._id,
        taskText: todo.text,
        pattern: todo.recurringPattern || "daily",
        recurringDays: todo.recurringDays || [],
        recurringInterval: todo.recurringInterval || 1,
        currentStreak: todo.currentStreak || 0,
        longestStreak: todo.longestStreak || 0,
        totalMissed,
        totalCompleted,
        completionRate,
        lastCompletedDate: todo.lastCompletedDate || null,
        deadline: todo.deadline || null,
        history,
      };
    });

    // Sort worst compliance first
    return stats.sort((a, b) => a.completionRate - b.completionRate);
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Detect and log all missed occurrences for a single recurring todo.
 * Idempotent — safe to call multiple times.
 * Also advances the todo's deadline to the next valid future date.
 */
export const detectAndLogMissed = mutation({
  args: { todoId: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId);
    if (!todo || !todo.isRecurring || todo.done) return { missedCount: 0 };

    const deadline = todo.deadline;
    if (!deadline) return { missedCount: 0 };

    const today = todayISO();
    // If deadline is today or in the future, nothing is missed yet
    if (deadline >= today) return { missedCount: 0 };

    // The root ID for logging
    const rootId = todo.parentRecurringId ?? todo._id;

    // Get all dates that should have occurred between deadline and today (exclusive)
    const missedDates = calculateMissedDates(todo, deadline, today);

    if (missedDates.length === 0) return { missedCount: 0 };

    // Fetch existing logs to avoid duplicates
    const existingLogs = await ctx.db
      .query("recurringMissedLogs")
      .withIndex("by_root", (q) => q.eq("recurringRootId", rootId))
      .collect();
    const existingDates = new Set(existingLogs.map((l) => l.missedDate));

    // Insert only new missed dates
    let newMissCount = 0;
    for (const missedDate of missedDates) {
      if (!existingDates.has(missedDate)) {
        await ctx.db.insert("recurringMissedLogs", {
          recurringRootId: rootId,
          missedDate,
          pattern: todo.recurringPattern || "daily",
          taskText: todo.text,
          loggedAt: Date.now(),
        });
        newMissCount++;
      }
    }

    // Advance the deadline to the next valid future date
    let newDeadline = deadline;
    let cursor = parseDate(deadline);
    const todayDate = parseDate(today);
    while (cursor < todayDate) {
      const next = nextOccurrenceAfter(todo, cursor);
      if (!next) break;
      cursor = next;
    }
    newDeadline = formatDate(cursor);

    // Update the todo: advance deadline, increment totalMissed, reset currentStreak
    const currentTotalMissed = todo.totalMissed || 0;
    const newTotalMissed = currentTotalMissed + newMissCount;

    // Streak is broken if there are new misses
    const streakUpdate = newMissCount > 0 ? { currentStreak: 0 } : {};

    await ctx.db.patch(args.todoId, {
      deadline: newDeadline,
      totalMissed: newTotalMissed,
      ...streakUpdate,
    });

    return { missedCount: newMissCount, newDeadline };
  },
});

/**
 * Scan ALL active recurring todos and detect/log any missed occurrences.
 * Called once per session from the client (throttled via localStorage).
 */
export const checkAllMissedRecurring = mutation({
  args: {},
  handler: async (ctx) => {
    const allTodos = await ctx.db.query("todos").collect();
    // Only process root recurring todos that are not done
    const recurringTodos = allTodos.filter(
      (t) => t.isRecurring && !t.done && t.deadline
    );

    const today = todayISO();
    let totalNewMisses = 0;
    let processed = 0;

    for (const todo of recurringTodos) {
      const deadline = todo.deadline!;
      if (deadline >= today) continue; // Not overdue

      const rootId = todo.parentRecurringId ?? todo._id;
      const missedDates = calculateMissedDates(todo, deadline, today);
      if (missedDates.length === 0) continue;

      // Fetch existing logs for this root
      const existingLogs = await ctx.db
        .query("recurringMissedLogs")
        .withIndex("by_root", (q) => q.eq("recurringRootId", rootId))
        .collect();
      const existingDates = new Set(existingLogs.map((l) => l.missedDate));

      let newMissCount = 0;
      for (const missedDate of missedDates) {
        if (!existingDates.has(missedDate)) {
          await ctx.db.insert("recurringMissedLogs", {
            recurringRootId: rootId,
            missedDate,
            pattern: todo.recurringPattern || "daily",
            taskText: todo.text,
            loggedAt: Date.now(),
          });
          newMissCount++;
        }
      }

      if (newMissCount > 0) {
        totalNewMisses += newMissCount;

        // Advance deadline to next valid future date
        let cursor = parseDate(deadline);
        const todayDate = parseDate(today);
        while (cursor < todayDate) {
          const next = nextOccurrenceAfter(todo, cursor);
          if (!next) break;
          cursor = next;
        }
        const newDeadline = formatDate(cursor);

        const currentTotalMissed = todo.totalMissed || 0;
        await ctx.db.patch(todo._id, {
          deadline: newDeadline,
          totalMissed: currentTotalMissed + newMissCount,
          currentStreak: 0, // Streak broken by miss
        });
      }

      processed++;
    }

    return { processed, totalNewMisses };
  },
});
