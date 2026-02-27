import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get productivity metrics for a date range
export const getProductivityMetrics = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db.query("todos").collect();
    const now = new Date();
    const startDate = args.startDate ? new Date(args.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = args.endDate ? new Date(args.endDate) : now;

    // Filter todos within date range
    const filteredTodos = todos.filter(todo => {
      const todoDate = todo.completedAt ? new Date(todo.completedAt) :
                      todo.createdAt ? new Date(todo.createdAt) :
                      new Date(todo._creationTime);
      return todoDate >= startDate && todoDate <= endDate;
    });

    const completedTodos = filteredTodos.filter(todo => todo.done);
    const totalTodos = filteredTodos.length;

    // Calculate completion rate
    const completionRate = totalTodos > 0 ? (completedTodos.length / totalTodos) * 100 : 0;

    // Calculate time metrics
    const totalTimeSpent = completedTodos.reduce((sum, todo) => sum + (todo.timeSpent || todo.actualMinutes || 0), 0);
    const totalEstimatedTime = filteredTodos.reduce((sum, todo) => sum + (todo.estimatedMinutes || 0), 0);
    const timeEfficiency = totalEstimatedTime > 0 ? (totalEstimatedTime / Math.max(totalTimeSpent, 1)) * 100 : 100;

    // Calculate average time per task
    const avgTimePerTask = completedTodos.length > 0 ? totalTimeSpent / completedTodos.length : 0;

    // Priority distribution
    const priorityStats = {
      high: completedTodos.filter(todo => todo.priority === 'high').length,
      medium: completedTodos.filter(todo => todo.priority === 'medium').length,
      low: completedTodos.filter(todo => todo.priority === 'low').length,
      none: completedTodos.filter(todo => !todo.priority).length,
    };

    // Category performance
    const categoryStats = completedTodos.reduce((acc, todo) => {
      const category = todo.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { completed: 0, timeSpent: 0 };
      }
      acc[category].completed++;
      acc[category].timeSpent += (todo.timeSpent || todo.actualMinutes || 0);
      return acc;
    }, {} as Record<string, { completed: number; timeSpent: number }>);

    // Calculate productivity score (0-100)
    const productivityScore = Math.min(100, Math.round(
      (completionRate * 0.4) +
      (Math.min(timeEfficiency, 100) * 0.3) +
      (priorityStats.high * 2 + priorityStats.medium * 1.5 + priorityStats.low * 1) * 0.3
    ));

    return {
      totalTodos,
      completedTodos: completedTodos.length,
      completionRate: Math.round(completionRate * 100) / 100,
      totalTimeSpent,
      totalEstimatedTime,
      timeEfficiency: Math.round(timeEfficiency * 100) / 100,
      avgTimePerTask: Math.round(avgTimePerTask * 100) / 100,
      priorityStats,
      categoryStats,
      productivityScore,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
    };
  },
});

// Get daily productivity data for charts
export const getDailyProductivityData = query({
  args: {
    days: v.optional(v.number()), // Number of days to look back
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const todos = await ctx.db.query("todos").collect();
    const now = new Date();

    // Create array of dates for the last N days
    const dateArray = Array.from({ length: days }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - 1 - i));
      return date.toISOString().split('T')[0];
    });

    // Group todos by completion date
    const dailyData = dateArray.map(date => {
      const dayStart = new Date(date + 'T00:00:00');
      const dayEnd = new Date(date + 'T23:59:59');

      const dayTodos = todos.filter(todo => {
        if (!todo.completedAt && !todo.done) return false;
        const completedDate = todo.completedAt ? new Date(todo.completedAt) : new Date(todo.doneAt || todo._creationTime);
        return completedDate >= dayStart && completedDate <= dayEnd;
      });

      const timeSpent = dayTodos.reduce((sum, todo) => sum + (todo.timeSpent || todo.actualMinutes || 0), 0);
      const highPriority = dayTodos.filter(todo => todo.priority === 'high').length;
      const mediumPriority = dayTodos.filter(todo => todo.priority === 'medium').length;
      const lowPriority = dayTodos.filter(todo => todo.priority === 'low').length;

      return {
        date,
        completed: dayTodos.length,
        timeSpent,
        highPriority,
        mediumPriority,
        lowPriority,
        productivityScore: dayTodos.length > 0 ? Math.min(100, (dayTodos.length * 10) + (timeSpent / 60 * 5)) : 0,
      };
    });

    return dailyData;
  },
});

// Get category performance data with advanced filtering
export const getCategoryPerformance = query({
  args: {
    period: v.optional(v.string()), // 'week', 'month', 'quarter'
    categories: v.optional(v.array(v.string())), // Filter by main categories
    subcategories: v.optional(v.array(v.string())), // Filter by subcategories
    activityTypes: v.optional(v.array(v.string())), // Filter by activity types
  },
  handler: async (ctx, args) => {
    const period = args.period || 'month';
    const todos = await ctx.db.query("todos").filter(q => q.eq(q.field("done"), true)).collect();

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Filter by date
    let filteredTodos = todos.filter(todo => {
      if (!todo.completedAt && !todo.doneAt) {
        return true;
      }
      const completedDate = todo.completedAt ? new Date(todo.completedAt) : new Date(todo.doneAt || todo._creationTime);
      return completedDate >= startDate;
    });

    // Apply category filters
    if (args.categories && args.categories.length > 0) {
      filteredTodos = filteredTodos.filter(todo =>
        args.categories!.includes(todo.mainCategory || todo.category || 'Uncategorized')
      );
    }

    if (args.subcategories && args.subcategories.length > 0) {
      filteredTodos = filteredTodos.filter(todo =>
        todo.subcategory && args.subcategories!.includes(todo.subcategory)
      );
    }

    if (args.activityTypes && args.activityTypes.length > 0) {
      filteredTodos = filteredTodos.filter(todo =>
        todo.activityType && args.activityTypes!.includes(todo.activityType)
      );
    }

    // Group by different levels based on what's being filtered
    const categoryData = new Map();

    filteredTodos.forEach(todo => {
      // Create separate entries for each level of categorization
      const mainCat = todo.mainCategory || todo.category || 'Uncategorized';
      const subCat = todo.subcategory;
      const actType = todo.activityType;

      // Always create main category entry
      const mainKey = `main:${mainCat}`;
      if (!categoryData.has(mainKey)) {
        categoryData.set(mainKey, {
          id: mainKey,
          name: mainCat,
          type: 'main',
          mainCategory: mainCat,
          subcategory: null,
          activityType: null,
          completed: 0,
          timeSpent: 0,
          avgTimePerTask: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0,
          tasks: []
        });
      }

      // Create subcategory entry if exists
      if (subCat) {
        const subKey = `sub:${mainCat}:${subCat}`;
        if (!categoryData.has(subKey)) {
          categoryData.set(subKey, {
            id: subKey,
            name: `${mainCat} › ${subCat}`,
            type: 'subcategory',
            mainCategory: mainCat,
            subcategory: subCat,
            activityType: null,
            completed: 0,
            timeSpent: 0,
            avgTimePerTask: 0,
            highPriority: 0,
            mediumPriority: 0,
            lowPriority: 0,
            tasks: []
          });
        }
      }

      // Create activity type entry if exists
      if (actType) {
        const actKey = `act:${mainCat}:${subCat || 'none'}:${actType}`;
        if (!categoryData.has(actKey)) {
          categoryData.set(actKey, {
            id: actKey,
            name: `${mainCat}${subCat ? ` › ${subCat}` : ''} › ${actType}`,
            type: 'activity',
            mainCategory: mainCat,
            subcategory: subCat || null,
            activityType: actType,
            completed: 0,
            timeSpent: 0,
            avgTimePerTask: 0,
            highPriority: 0,
            mediumPriority: 0,
            lowPriority: 0,
            tasks: []
          });
        }
      }

      // Update statistics for all relevant entries
      const timeSpent = todo.timeSpent || todo.actualMinutes || 0;
      const priority = todo.priority;

      [mainKey, subCat ? `sub:${mainCat}:${subCat}` : null, actType ? `act:${mainCat}:${subCat || 'none'}:${actType}` : null]
        .filter(Boolean)
        .forEach(key => {
          const entry = categoryData.get(key);
          if (entry) {
            entry.completed++;
            entry.timeSpent += timeSpent;
            entry.tasks.push(todo._id);

            if (priority === 'high') entry.highPriority++;
            else if (priority === 'medium') entry.mediumPriority++;
            else if (priority === 'low') entry.lowPriority++;
          }
        });
    });

    // Calculate averages and convert to array
    const result = Array.from(categoryData.values()).map(category => ({
      ...category,
      avgTimePerTask: category.completed > 0 ? Math.round((category.timeSpent / category.completed) * 100) / 100 : 0,
      tasks: undefined // Remove task IDs from response
    }));

    // Sort by completion count descending
    return result.sort((a, b) => b.completed - a.completed);
  },
});

// Get aggregated category statistics for better overview
export const getCategoryStatistics = query({
  args: {
    period: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    subcategories: v.optional(v.array(v.string())),
    activityTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Get category performance data directly instead of using runQuery
    const period = args.period || 'month';
    const todos = await ctx.db.query("todos").filter(q => q.eq(q.field("done"), true)).collect();

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Filter by date and categories
    let filteredTodos = todos.filter(todo => {
      if (!todo.completedAt && !todo.doneAt) {
        return true;
      }
      const completedDate = todo.completedAt ? new Date(todo.completedAt) : new Date(todo.doneAt || todo._creationTime);
      return completedDate >= startDate;
    });

    // Apply category filters
    if (args.categories && args.categories.length > 0) {
      filteredTodos = filteredTodos.filter(todo =>
        args.categories!.includes(todo.mainCategory || todo.category || 'Uncategorized')
      );
    }

    if (args.subcategories && args.subcategories.length > 0) {
      filteredTodos = filteredTodos.filter(todo =>
        todo.subcategory && args.subcategories!.includes(todo.subcategory)
      );
    }

    if (args.activityTypes && args.activityTypes.length > 0) {
      filteredTodos = filteredTodos.filter(todo =>
        todo.activityType && args.activityTypes!.includes(todo.activityType)
      );
    }

    // Aggregate statistics
    const mainCategories = new Map<string, any>();
    const subcategories = new Map<string, any>();
    const activityTypes = new Map<string, any>();

    filteredTodos.forEach(todo => {
      const mainCat = todo.mainCategory || todo.category || 'Uncategorized';
      const subCat = todo.subcategory;
      const actType = todo.activityType;
      const timeSpent = todo.timeSpent || todo.actualMinutes || 0;

      // Main category stats
      if (!mainCategories.has(mainCat)) {
        mainCategories.set(mainCat, {
          name: mainCat,
          type: 'main',
          completed: 0,
          timeSpent: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0,
        });
      }
      const mainEntry = mainCategories.get(mainCat);
      mainEntry.completed++;
      mainEntry.timeSpent += timeSpent;
      if (todo.priority === 'high') mainEntry.highPriority++;
      else if (todo.priority === 'medium') mainEntry.mediumPriority++;
      else if (todo.priority === 'low') mainEntry.lowPriority++;

      // Subcategory stats
      if (subCat) {
        const subKey = `${mainCat}:${subCat}`;
        if (!subcategories.has(subKey)) {
          subcategories.set(subKey, {
            name: `${mainCat} › ${subCat}`,
            type: 'subcategory',
            completed: 0,
            timeSpent: 0,
            highPriority: 0,
            mediumPriority: 0,
            lowPriority: 0,
          });
        }
        const subEntry = subcategories.get(subKey);
        subEntry.completed++;
        subEntry.timeSpent += timeSpent;
        if (todo.priority === 'high') subEntry.highPriority++;
        else if (todo.priority === 'medium') subEntry.mediumPriority++;
        else if (todo.priority === 'low') subEntry.lowPriority++;
      }

      // Activity type stats
      if (actType) {
        const actKey = `${mainCat}:${subCat || 'none'}:${actType}`;
        if (!activityTypes.has(actKey)) {
          activityTypes.set(actKey, {
            name: `${mainCat}${subCat ? ` › ${subCat}` : ''} › ${actType}`,
            type: 'activity',
            completed: 0,
            timeSpent: 0,
            highPriority: 0,
            mediumPriority: 0,
            lowPriority: 0,
          });
        }
        const actEntry = activityTypes.get(actKey);
        actEntry.completed++;
        actEntry.timeSpent += timeSpent;
        if (todo.priority === 'high') actEntry.highPriority++;
        else if (todo.priority === 'medium') actEntry.mediumPriority++;
        else if (todo.priority === 'low') actEntry.lowPriority++;
      }
    });

    const allCategories = [
      ...Array.from(mainCategories.values()),
      ...Array.from(subcategories.values()),
      ...Array.from(activityTypes.values())
    ];

    const stats = {
      mainCategories: Array.from(mainCategories.values()),
      subcategories: Array.from(subcategories.values()),
      activityTypes: Array.from(activityTypes.values()),
      totals: {
        completed: allCategories.reduce((sum: number, c: any) => sum + c.completed, 0),
        timeSpent: allCategories.reduce((sum: number, c: any) => sum + c.timeSpent, 0),
        highPriority: allCategories.reduce((sum: number, c: any) => sum + c.highPriority, 0),
        mediumPriority: allCategories.reduce((sum: number, c: any) => sum + c.mediumPriority, 0),
        lowPriority: allCategories.reduce((sum: number, c: any) => sum + c.lowPriority, 0),
      }
    };

    return stats;
  },
});

// Get productivity insights and patterns
export const getProductivityInsights = query({
  args: {},
  handler: async (ctx) => {
    const todos = await ctx.db.query("todos").collect();
    const completedTodos = todos.filter(todo => todo.done);

    if (completedTodos.length === 0) {
      return {
        insights: [],
        patterns: {},
        recommendations: [],
      };
    }

    // Analyze completion patterns by day of week
    const dayOfWeekStats = Array(7).fill(0);
    const hourOfDayStats = Array(24).fill(0);

    completedTodos.forEach(todo => {
      const completedDate = todo.completedAt ? new Date(todo.completedAt) : new Date(todo.doneAt || todo._creationTime);
      dayOfWeekStats[completedDate.getDay()]++;
      hourOfDayStats[completedDate.getHours()]++;
    });

    // Find peak day and hour
    const peakDay = dayOfWeekStats.indexOf(Math.max(...dayOfWeekStats));
    const peakHour = hourOfDayStats.indexOf(Math.max(...hourOfDayStats));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Calculate time efficiency
    const tasksWithTime = completedTodos.filter(todo => (todo.estimatedMinutes || 0) > 0 && (todo.timeSpent || todo.actualMinutes || 0) > 0);
    const avgEfficiency = tasksWithTime.length > 0 ?
      tasksWithTime.reduce((sum, todo) => {
        const estimated = todo.estimatedMinutes || 0;
        const actual = todo.timeSpent || todo.actualMinutes || 0;
        return sum + (estimated / Math.max(actual, 1));
      }, 0) / tasksWithTime.length : 1;

    // Generate insights
    const insights = [];

    if (dayOfWeekStats[peakDay] > 0) {
      const peakDayPercentage = Math.round((dayOfWeekStats[peakDay] / completedTodos.length) * 100);
      insights.push(`You're most productive on ${dayNames[peakDay]}s (${peakDayPercentage}% of tasks completed)`);
    }

    if (peakHour >= 0) {
      const peakHourPercentage = Math.round((hourOfDayStats[peakHour] / completedTodos.length) * 100);
      const hourDisplay = peakHour === 0 ? '12 AM' : peakHour <= 12 ? `${peakHour} AM` : `${peakHour - 12} PM`;
      insights.push(`Your peak productivity hour is ${hourDisplay} (${peakHourPercentage}% of tasks)`);
    }

    if (avgEfficiency < 0.8) {
      insights.push(`Tasks typically take ${Math.round((1/avgEfficiency) * 100)}% longer than estimated`);
    } else if (avgEfficiency > 1.2) {
      insights.push(`You consistently finish tasks ${Math.round((avgEfficiency - 1) * 100)}% faster than estimated`);
    }

    // Priority analysis
    const highPriorityTasks = completedTodos.filter(todo => todo.priority === 'high');
    const avgHighPriorityTime = highPriorityTasks.length > 0 ?
      highPriorityTasks.reduce((sum, todo) => sum + (todo.timeSpent || todo.actualMinutes || 0), 0) / highPriorityTasks.length : 0;
    const avgOtherTaskTime = completedTodos.filter(todo => todo.priority !== 'high').length > 0 ?
      completedTodos.filter(todo => todo.priority !== 'high').reduce((sum, todo) => sum + (todo.timeSpent || todo.actualMinutes || 0), 0) /
      completedTodos.filter(todo => todo.priority !== 'high').length : 0;

    if (avgHighPriorityTime > avgOtherTaskTime * 1.5) {
      insights.push(`High priority tasks take ${Math.round((avgHighPriorityTime / avgOtherTaskTime) * 100)}% longer on average`);
    }

    // Generate recommendations
    const recommendations = [];

    if (peakHour >= 9 && peakHour <= 11) {
      recommendations.push('Schedule your most important tasks in the morning when you\'re most productive');
    } else if (peakHour >= 14 && peakHour <= 16) {
      recommendations.push('Your afternoon productivity peak is ideal for focused work');
    }

    if (avgEfficiency < 0.7) {
      recommendations.push('Consider breaking down large tasks or adding buffer time to estimates');
    }

    const categoryCount = new Set(completedTodos.map(todo => todo.category || 'Uncategorized')).size;
    if (categoryCount > 5) {
      recommendations.push('Consider consolidating categories to maintain better focus');
    }

    return {
      insights,
      patterns: {
        dayOfWeek: dayOfWeekStats,
        hourOfDay: hourOfDayStats,
        peakDay: dayNames[peakDay],
        peakHour,
        avgEfficiency: Math.round(avgEfficiency * 100) / 100,
      },
      recommendations,
    };
  },
});

// Goals management
export const getGoals = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("goals").order("desc").collect();
  },
});

export const createGoal = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    targetType: v.union(v.literal("tasks_completed"), v.literal("time_spent"), v.literal("category_focus")),
    targetValue: v.number(),
    targetCategory: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("goals", {
      ...args,
      isActive: true,
      currentProgress: 0,
      createdAt: Date.now(),
      streak: 0,
    });
  },
});

export const updateGoalProgress = mutation({
  args: {
    goalId: v.id("goals"),
    progress: v.number(),
  },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new Error("Goal not found");

    const isCompleted = args.progress >= goal.targetValue;
    const updates: any = {
      currentProgress: args.progress,
    };

    if (isCompleted && !goal.completedAt) {
      updates.completedAt = Date.now();
      updates.streak = (goal.streak || 0) + 1;
    }

    return await ctx.db.patch(args.goalId, updates);
  },
});

// Productivity sessions tracking
export const createProductivitySession = mutation({
  args: {
    date: v.string(),
    tasksCompleted: v.number(),
    tasksCreated: v.number(),
    totalTimeSpent: v.number(),
    highPriorityCompleted: v.number(),
    mediumPriorityCompleted: v.number(),
    lowPriorityCompleted: v.number(),
    categoriesWorked: v.array(v.string()),
    productivityScore: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if session already exists for this date
    const existingSession = await ctx.db
      .query("productivitySessions")
      .filter(q => q.eq(q.field("date"), args.date))
      .first();

    if (existingSession) {
      // Update existing session
      return await ctx.db.patch(existingSession._id, {
        ...args,
        createdAt: Date.now(),
      });
    } else {
      // Create new session
      return await ctx.db.insert("productivitySessions", {
        ...args,
        createdAt: Date.now(),
      });
    }
  },
});

export const getProductivitySessions = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("productivitySessions");

    if (args.startDate || args.endDate) {
      query = query.filter(q => {
        let filter = q.gte(q.field("date"), args.startDate || "1970-01-01");
        if (args.endDate) {
          filter = q.and(filter, q.lte(q.field("date"), args.endDate));
        }
        return filter;
      });
    }

    return await query.order("desc").collect();
  },
});

// ─── Task Mastery Stats ───────────────────────────────────────────────────────
// Returns per-category mastery data: completion rate, consistency, high-priority
// ratio, trend, and a composite mastery score (0-100).
export const getTaskMasteryStats = query({
  args: {
    period: v.optional(v.string()), // 'week' | 'month' | 'quarter'
  },
  handler: async (ctx, args) => {
    const period = args.period || 'month';
    const allTodos = await ctx.db.query("todos").collect();

    const now = new Date();
    let periodMs: number;
    switch (period) {
      case 'week':    periodMs = 7  * 24 * 60 * 60 * 1000; break;
      case 'quarter': periodMs = 90 * 24 * 60 * 60 * 1000; break;
      default:        periodMs = 30 * 24 * 60 * 60 * 1000;
    }
    const startDate = new Date(now.getTime() - periodMs);
    const midDate   = new Date(now.getTime() - periodMs / 2);

    // Only todos created or completed within the period
    const periodTodos = allTodos.filter(todo => {
      const ref = todo.completedAt
        ? new Date(todo.completedAt)
        : todo.createdAt
          ? new Date(todo.createdAt)
          : new Date(todo._creationTime);
      return ref >= startDate;
    });

    // Build per-category buckets
    type CatBucket = {
      total: number;
      completed: number;
      highPriorityTotal: number;
      highPriorityCompleted: number;
      totalTimeMinutes: number;
      completedDays: Set<string>;
      firstHalfCompleted: number;
      secondHalfCompleted: number;
    };
    const buckets = new Map<string, CatBucket>();

    const ensureBucket = (cat: string) => {
      if (!buckets.has(cat)) {
        buckets.set(cat, {
          total: 0,
          completed: 0,
          highPriorityTotal: 0,
          highPriorityCompleted: 0,
          totalTimeMinutes: 0,
          completedDays: new Set(),
          firstHalfCompleted: 0,
          secondHalfCompleted: 0,
        });
      }
      return buckets.get(cat)!;
    };

    periodTodos.forEach(todo => {
      const cat = todo.mainCategory || todo.category || 'Uncategorized';
      const b = ensureBucket(cat);
      b.total++;
      if (todo.priority === 'high') b.highPriorityTotal++;

      if (todo.done) {
        b.completed++;
        b.totalTimeMinutes += todo.timeSpent || todo.actualMinutes || 0;
        if (todo.priority === 'high') b.highPriorityCompleted++;

        const completedAt = todo.completedAt
          ? new Date(todo.completedAt)
          : new Date(todo._creationTime);
        b.completedDays.add(completedAt.toISOString().split('T')[0]);

        if (completedAt < midDate) {
          b.firstHalfCompleted++;
        } else {
          b.secondHalfCompleted++;
        }
      }
    });

    // Total days in period for consistency calculation
    const totalDays = Math.ceil(periodMs / (24 * 60 * 60 * 1000));

    const result = Array.from(buckets.entries()).map(([category, b]) => {
      const completionRate = b.total > 0
        ? Math.round((b.completed / b.total) * 100)
        : 0;

      const consistencyScore = Math.round((b.completedDays.size / totalDays) * 100);

      const highPriorityRatio = b.highPriorityTotal > 0
        ? Math.round((b.highPriorityCompleted / b.highPriorityTotal) * 100)
        : completionRate; // fall back to overall rate if no high-priority tasks

      const masteryScore = Math.min(100, Math.round(
        completionRate * 0.5 +
        consistencyScore * 0.3 +
        highPriorityRatio * 0.2
      ));

      // Trend: compare first half vs second half completion counts
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (b.secondHalfCompleted > b.firstHalfCompleted * 1.2) trend = 'improving';
      else if (b.secondHalfCompleted < b.firstHalfCompleted * 0.8) trend = 'declining';

      const avgTimeMinutes = b.completed > 0
        ? Math.round(b.totalTimeMinutes / b.completed)
        : 0;

      return {
        category,
        total: b.total,
        completed: b.completed,
        completionRate,
        avgTimeMinutes,
        highPriorityCompleted: b.highPriorityCompleted,
        highPriorityTotal: b.highPriorityTotal,
        consistencyScore,
        masteryScore,
        trend,
        activeDays: b.completedDays.size,
      };
    });

    // Sort by mastery score descending
    return result.sort((a, b) => b.masteryScore - a.masteryScore);
  },
});

// ─── Lag Indicators ───────────────────────────────────────────────────────────
// Returns categories and priority buckets where the user is lagging.
export const getLagIndicators = query({
  args: {
    period: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const period = args.period || 'month';
    const allTodos = await ctx.db.query("todos").collect();
    const now = new Date();

    let periodMs: number;
    switch (period) {
      case 'week':    periodMs = 7  * 24 * 60 * 60 * 1000; break;
      case 'quarter': periodMs = 90 * 24 * 60 * 60 * 1000; break;
      default:        periodMs = 30 * 24 * 60 * 60 * 1000;
    }
    const startDate = new Date(now.getTime() - periodMs);

    // All todos in period (not just completed)
    const periodTodos = allTodos.filter(todo => {
      const ref = todo.completedAt
        ? new Date(todo.completedAt)
        : todo.createdAt
          ? new Date(todo.createdAt)
          : new Date(todo._creationTime);
      return ref >= startDate;
    });

    type CatLag = {
      total: number;
      completed: number;
      overdueCount: number;
      totalDaysOverdue: number;
      lastCompletedAt: number | null;
    };
    const catMap = new Map<string, CatLag>();

    const ensureCat = (cat: string) => {
      if (!catMap.has(cat)) {
        catMap.set(cat, {
          total: 0,
          completed: 0,
          overdueCount: 0,
          totalDaysOverdue: 0,
          lastCompletedAt: null,
        });
      }
      return catMap.get(cat)!;
    };

    periodTodos.forEach(todo => {
      const cat = todo.mainCategory || todo.category || 'Uncategorized';
      const c = ensureCat(cat);
      c.total++;

      if (todo.done) {
        c.completed++;
        const completedTs = todo.completedAt || todo._creationTime;
        if (!c.lastCompletedAt || completedTs > c.lastCompletedAt) {
          c.lastCompletedAt = completedTs;
        }
      } else if (todo.deadline) {
        const deadline = new Date(todo.deadline);
        if (deadline < now) {
          c.overdueCount++;
          const daysOverdue = Math.ceil((now.getTime() - deadline.getTime()) / (24 * 60 * 60 * 1000));
          c.totalDaysOverdue += daysOverdue;
        }
      }
    });

    const lagCategories = Array.from(catMap.entries()).map(([category, c]) => {
      const completionRate = c.total > 0
        ? Math.round((c.completed / c.total) * 100)
        : 0;
      const overdueRatio = c.total > 0 ? c.overdueCount / c.total : 0;
      const avgDaysOverdue = c.overdueCount > 0
        ? Math.round(c.totalDaysOverdue / c.overdueCount)
        : 0;

      const lagScore = Math.min(100, Math.round(
        overdueRatio * 40 +
        (1 - completionRate / 100) * 40 +
        Math.min(avgDaysOverdue / 30, 1) * 20
      ));

      const lastCompletedAt = c.lastCompletedAt
        ? new Date(c.lastCompletedAt).toISOString().split('T')[0]
        : null;

      const daysSinceLastCompletion = c.lastCompletedAt
        ? Math.floor((now.getTime() - c.lastCompletedAt) / (24 * 60 * 60 * 1000))
        : null;

      return {
        category,
        total: c.total,
        completed: c.completed,
        pendingCount: c.total - c.completed,
        overdueCount: c.overdueCount,
        completionRate,
        avgDaysOverdue,
        lagScore,
        lastCompletedAt,
        daysSinceLastCompletion,
      };
    });

    // Priority lag
    const priorities = ['high', 'medium', 'low'] as const;
    const lagPriorities = priorities.map(priority => {
      const pTodos = periodTodos.filter(t => t.priority === priority);
      const completed = pTodos.filter(t => t.done).length;
      const overdue = pTodos.filter(t => !t.done && t.deadline && new Date(t.deadline) < now).length;
      return {
        priority,
        total: pTodos.length,
        completed,
        pendingCount: pTodos.length - completed,
        overdueCount: overdue,
        completionRate: pTodos.length > 0 ? Math.round((completed / pTodos.length) * 100) : 0,
      };
    });

    // Overall lag score = weighted average of category lag scores
    const overallLagScore = lagCategories.length > 0
      ? Math.round(lagCategories.reduce((sum, c) => sum + c.lagScore, 0) / lagCategories.length)
      : 0;

    return {
      lagCategories: lagCategories.sort((a, b) => b.lagScore - a.lagScore),
      lagPriorities,
      overallLagScore,
    };
  },
});

// ─── Missed Tasks Analysis ────────────────────────────────────────────────────
// Returns overdue tasks, never-started tasks, and skipped recurring tasks.
export const getMissedTasksAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const allTodos = await ctx.db.query("todos").collect();
    const now = new Date();
    const nowTs = now.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // 1. Overdue tasks — not done, has deadline, deadline is in the past
    const overdueTasks = allTodos
      .filter(todo => !todo.done && todo.deadline && new Date(todo.deadline) < now)
      .map(todo => {
        const deadline = new Date(todo.deadline!);
        const daysOverdue = Math.ceil((nowTs - deadline.getTime()) / (24 * 60 * 60 * 1000));
        return {
          id: todo._id,
          text: todo.text,
          deadline: todo.deadline!,
          daysOverdue,
          priority: todo.priority || 'none',
          category: todo.mainCategory || todo.category || 'Uncategorized',
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // 2. Never-started tasks — not done, created >7 days ago, no time logged
    const neverStartedTasks = allTodos
      .filter(todo => {
        if (todo.done) return false;
        const createdAt = todo.createdAt
          ? new Date(todo.createdAt).getTime()
          : todo._creationTime;
        const ageMs = nowTs - createdAt;
        const hasTime = (todo.timeSpent || 0) > 0 || (todo.actualMinutes || 0) > 0;
        return ageMs > sevenDaysMs && !hasTime;
      })
      .map(todo => {
        const createdAt = todo.createdAt
          ? new Date(todo.createdAt).getTime()
          : todo._creationTime;
        const createdDaysAgo = Math.floor((nowTs - createdAt) / (24 * 60 * 60 * 1000));
        return {
          id: todo._id,
          text: todo.text,
          createdDaysAgo,
          priority: todo.priority || 'none',
          category: todo.mainCategory || todo.category || 'Uncategorized',
        };
      })
      .sort((a, b) => b.createdDaysAgo - a.createdDaysAgo);

    // 3. Skipped recurring tasks — isRecurring=true, not done, last completion
    //    is older than their pattern window
    const recurringTodos = allTodos.filter(todo => todo.isRecurring);

    // Find the most recent completion for each recurring task (by text match)
    const completedRecurring = allTodos.filter(t => t.done && t.isRecurring);
    const lastCompletionByText = new Map<string, number>();
    completedRecurring.forEach(t => {
      const ts = t.completedAt || t._creationTime;
      const existing = lastCompletionByText.get(t.text);
      if (!existing || ts > existing) {
        lastCompletionByText.set(t.text, ts);
      }
    });

    const patternWindowMs = (pattern: string | undefined, interval: number | undefined): number => {
      switch (pattern) {
        case 'daily':   return (interval || 1) * 24 * 60 * 60 * 1000;
        case 'weekly':  return (interval || 1) * 7 * 24 * 60 * 60 * 1000;
        case 'monthly': return (interval || 1) * 30 * 24 * 60 * 60 * 1000;
        default:        return 7 * 24 * 60 * 60 * 1000; // default weekly
      }
    };

    const skippedRecurring = recurringTodos
      .filter(todo => {
        if (todo.done) return false;
        const windowMs = patternWindowMs(todo.recurringPattern, todo.recurringInterval);
        const lastTs = lastCompletionByText.get(todo.text);
        if (!lastTs) return true; // never completed
        return (nowTs - lastTs) > windowMs;
      })
      .map(todo => {
        const lastTs = lastCompletionByText.get(todo.text) || null;
        const daysSinceLastCompletion = lastTs
          ? Math.floor((nowTs - lastTs) / (24 * 60 * 60 * 1000))
          : null;
        return {
          id: todo._id,
          text: todo.text,
          recurringPattern: todo.recurringPattern || 'custom',
          recurringInterval: todo.recurringInterval || 1,
          lastCompletedAt: lastTs ? new Date(lastTs).toISOString().split('T')[0] : null,
          daysSinceLastCompletion,
          priority: todo.priority || 'none',
          category: todo.mainCategory || todo.category || 'Uncategorized',
        };
      })
      .sort((a, b) => (b.daysSinceLastCompletion ?? 9999) - (a.daysSinceLastCompletion ?? 9999));

    const criticalMissed = overdueTasks.filter(t => t.priority === 'high').length;

    return {
      overdueTasks,
      neverStartedTasks,
      skippedRecurring,
      summary: {
        totalMissed: overdueTasks.length + neverStartedTasks.length + skippedRecurring.length,
        criticalMissed,
        recurringMissed: skippedRecurring.length,
        overdueCount: overdueTasks.length,
        neverStartedCount: neverStartedTasks.length,
      },
    };
  },
});
