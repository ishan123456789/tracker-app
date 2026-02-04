/**
 * Utility class for calculating productivity metrics and analytics
 */
export class MetricsCalculator {
  /**
   * Calculate completion rate for a set of todos
   * @param {Array} todos - Array of todo objects
   * @returns {number} Completion rate as percentage (0-100)
   */
  static calculateCompletionRate(todos) {
    if (!todos || todos.length === 0) return 0;
    const completed = todos.filter(todo => todo.done).length;
    return Math.round((completed / todos.length) * 100 * 100) / 100;
  }

  /**
   * Calculate time efficiency (estimated vs actual time)
   * @param {Array} todos - Array of todo objects with time data
   * @returns {number} Efficiency percentage (>100 means faster than estimated)
   */
  static calculateTimeEfficiency(todos) {
    const todosWithTime = todos.filter(todo =>
      todo.done &&
      (todo.estimatedMinutes || 0) > 0 &&
      (todo.timeSpent || todo.actualMinutes || 0) > 0
    );

    if (todosWithTime.length === 0) return 100;

    const totalEstimated = todosWithTime.reduce((sum, todo) => sum + (todo.estimatedMinutes || 0), 0);
    const totalActual = todosWithTime.reduce((sum, todo) => sum + (todo.timeSpent || todo.actualMinutes || 0), 0);

    return Math.round((totalEstimated / totalActual) * 100 * 100) / 100;
  }

  /**
   * Calculate average time per task
   * @param {Array} todos - Array of completed todo objects
   * @returns {number} Average time in minutes
   */
  static calculateAverageTimePerTask(todos) {
    const completedTodos = todos.filter(todo => todo.done);
    if (completedTodos.length === 0) return 0;

    const totalTime = completedTodos.reduce((sum, todo) =>
      sum + (todo.timeSpent || todo.actualMinutes || 0), 0
    );

    return Math.round((totalTime / completedTodos.length) * 100) / 100;
  }

  /**
   * Calculate productivity score based on multiple factors
   * @param {Object} metrics - Object containing various metrics
   * @returns {number} Productivity score (0-100)
   */
  static calculateProductivityScore(metrics) {
    const {
      completionRate = 0,
      timeEfficiency = 100,
      priorityStats = {},
      totalTasks = 0,
      timeSpent = 0
    } = metrics;

    // Base score from completion rate (40% weight)
    let score = completionRate * 0.4;

    // Time efficiency bonus/penalty (30% weight)
    const efficiencyScore = Math.min(timeEfficiency, 150) * 0.3;
    score += efficiencyScore;

    // Priority completion bonus (20% weight)
    const priorityScore = (
      (priorityStats.high || 0) * 3 +
      (priorityStats.medium || 0) * 2 +
      (priorityStats.low || 0) * 1
    ) / Math.max(totalTasks, 1) * 20;
    score += priorityScore;

    // Activity bonus (10% weight) - more time spent = higher score
    const activityScore = Math.min(timeSpent / 60, 8) / 8 * 10; // Max 8 hours
    score += activityScore;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Get priority distribution statistics
   * @param {Array} todos - Array of todo objects
   * @returns {Object} Priority statistics
   */
  static getPriorityStats(todos) {
    const stats = {
      high: 0,
      medium: 0,
      low: 0,
      none: 0
    };

    todos.forEach(todo => {
      if (todo.priority === 'high') stats.high++;
      else if (todo.priority === 'medium') stats.medium++;
      else if (todo.priority === 'low') stats.low++;
      else stats.none++;
    });

    return stats;
  }

  /**
   * Get category performance statistics
   * @param {Array} todos - Array of todo objects
   * @returns {Object} Category statistics
   */
  static getCategoryStats(todos) {
    const stats = {};

    todos.forEach(todo => {
      const category = todo.category || 'Uncategorized';
      if (!stats[category]) {
        stats[category] = {
          total: 0,
          completed: 0,
          timeSpent: 0,
          avgTime: 0,
          completionRate: 0
        };
      }

      stats[category].total++;
      if (todo.done) {
        stats[category].completed++;
        stats[category].timeSpent += (todo.timeSpent || todo.actualMinutes || 0);
      }
    });

    // Calculate derived metrics
    Object.values(stats).forEach(category => {
      category.completionRate = category.total > 0 ?
        Math.round((category.completed / category.total) * 100 * 100) / 100 : 0;
      category.avgTime = category.completed > 0 ?
        Math.round((category.timeSpent / category.completed) * 100) / 100 : 0;
    });

    return stats;
  }

  /**
   * Analyze productivity patterns by time
   * @param {Array} todos - Array of todo objects with completion timestamps
   * @returns {Object} Time-based patterns
   */
  static analyzeTimePatterns(todos) {
    const completedTodos = todos.filter(todo => todo.done && (todo.completedAt || todo.doneAt));

    if (completedTodos.length === 0) {
      return {
        hourOfDay: Array(24).fill(0),
        dayOfWeek: Array(7).fill(0),
        peakHour: null,
        peakDay: null
      };
    }

    const hourStats = Array(24).fill(0);
    const dayStats = Array(7).fill(0);

    completedTodos.forEach(todo => {
      const date = new Date(todo.completedAt || todo.doneAt || todo._creationTime);
      hourStats[date.getHours()]++;
      dayStats[date.getDay()]++;
    });

    const peakHour = hourStats.indexOf(Math.max(...hourStats));
    const peakDay = dayStats.indexOf(Math.max(...dayStats));

    return {
      hourOfDay: hourStats,
      dayOfWeek: dayStats,
      peakHour,
      peakDay,
      peakHourCount: hourStats[peakHour],
      peakDayCount: dayStats[peakDay]
    };
  }

  /**
   * Calculate streak information
   * @param {Array} todos - Array of todo objects
   * @returns {Object} Streak information
   */
  static calculateStreaks(todos) {
    const completedTodos = todos
      .filter(todo => todo.done && (todo.completedAt || todo.doneAt))
      .sort((a, b) => (b.completedAt || b.doneAt) - (a.completedAt || a.doneAt));

    if (completedTodos.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletionDate: null
      };
    }

    // Group by date
    const dateGroups = {};
    completedTodos.forEach(todo => {
      const date = new Date(todo.completedAt || todo.doneAt || todo._creationTime);
      const dateKey = date.toISOString().split('T')[0];
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = 0;
      }
      dateGroups[dateKey]++;
    });

    const dates = Object.keys(dateGroups).sort().reverse();
    const today = new Date().toISOString().split('T')[0];

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate current streak
    for (let i = 0; i < dates.length; i++) {
      const date = new Date(dates[i]);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];

      if (dates[i] === expectedDateStr) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const currentDate = new Date(dates[i]);
        const prevDate = new Date(dates[i - 1]);
        const dayDiff = (prevDate - currentDate) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      currentStreak,
      longestStreak,
      lastCompletionDate: dates[0] || null,
      totalActiveDays: dates.length
    };
  }

  /**
   * Generate productivity insights based on data analysis
   * @param {Array} todos - Array of todo objects
   * @returns {Array} Array of insight strings
   */
  static generateInsights(todos) {
    const insights = [];
    const completedTodos = todos.filter(todo => todo.done);

    if (completedTodos.length === 0) {
      return ['Start completing tasks to see productivity insights!'];
    }

    // Time patterns
    const timePatterns = this.analyzeTimePatterns(todos);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (timePatterns.peakDay !== null) {
      const peakDayPercentage = Math.round((timePatterns.peakDayCount / completedTodos.length) * 100);
      insights.push(`You're most productive on ${dayNames[timePatterns.peakDay]}s (${peakDayPercentage}% of tasks)`);
    }

    if (timePatterns.peakHour !== null) {
      const peakHourPercentage = Math.round((timePatterns.peakHourCount / completedTodos.length) * 100);
      const hourDisplay = timePatterns.peakHour === 0 ? '12 AM' :
        timePatterns.peakHour <= 12 ? `${timePatterns.peakHour} AM` :
        `${timePatterns.peakHour - 12} PM`;
      insights.push(`Peak productivity time: ${hourDisplay} (${peakHourPercentage}% of completions)`);
    }

    // Efficiency insights
    const efficiency = this.calculateTimeEfficiency(todos);
    if (efficiency < 80) {
      insights.push(`Tasks take ${Math.round((100/efficiency) * 100)}% longer than estimated - consider more realistic planning`);
    } else if (efficiency > 120) {
      insights.push(`You finish tasks ${Math.round((efficiency - 100))}% faster than estimated - great efficiency!`);
    }

    // Priority insights
    const priorityStats = this.getPriorityStats(completedTodos);
    const totalCompleted = completedTodos.length;
    const highPriorityPercentage = Math.round((priorityStats.high / totalCompleted) * 100);

    if (highPriorityPercentage > 50) {
      insights.push(`${highPriorityPercentage}% of completed tasks were high priority - excellent focus!`);
    } else if (highPriorityPercentage < 20) {
      insights.push(`Only ${highPriorityPercentage}% of completed tasks were high priority - consider prioritizing better`);
    }

    // Streak insights
    const streaks = this.calculateStreaks(todos);
    if (streaks.currentStreak > 0) {
      insights.push(`Current productivity streak: ${streaks.currentStreak} day${streaks.currentStreak > 1 ? 's' : ''}`);
    }
    if (streaks.longestStreak > 7) {
      insights.push(`Longest productivity streak: ${streaks.longestStreak} days - impressive consistency!`);
    }

    return insights;
  }

  /**
   * Format time duration for display
   * @param {number} minutes - Time in minutes
   * @returns {string} Formatted time string
   */
  static formatTime(minutes) {
    if (!minutes || minutes === 0) return '0m';

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }

  /**
   * Calculate goal progress
   * @param {Object} goal - Goal object
   * @param {Array} todos - Array of todo objects
   * @returns {Object} Progress information
   */
  static calculateGoalProgress(goal, todos) {
    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);
    const now = new Date();

    // Filter todos within goal period
    const relevantTodos = todos.filter(todo => {
      const todoDate = new Date(todo.completedAt || todo.doneAt || todo._creationTime);
      return todoDate >= startDate && todoDate <= endDate;
    });

    let currentProgress = 0;

    switch (goal.targetType) {
      case 'tasks_completed':
        currentProgress = relevantTodos.filter(todo => todo.done).length;
        break;
      case 'time_spent':
        currentProgress = relevantTodos
          .filter(todo => todo.done)
          .reduce((sum, todo) => sum + (todo.timeSpent || todo.actualMinutes || 0), 0);
        break;
      case 'category_focus':
        if (goal.targetCategory) {
          currentProgress = relevantTodos
            .filter(todo => todo.done && todo.category === goal.targetCategory)
            .length;
        }
        break;
    }

    const progressPercentage = Math.min(100, Math.round((currentProgress / goal.targetValue) * 100));
    const isCompleted = currentProgress >= goal.targetValue;
    const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysElapsed = totalDays - daysRemaining;

    return {
      currentProgress,
      progressPercentage,
      isCompleted,
      daysRemaining,
      daysElapsed,
      totalDays,
      isOverdue: now > endDate && !isCompleted
    };
  }
}
