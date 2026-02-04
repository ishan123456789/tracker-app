import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Migration mapping for common legacy categories to hierarchical categories
const CATEGORY_MIGRATION_MAP: Record<string, { mainCategory: string; subcategory: string; activityType: string | null }> = {
  // Fitness categories
  "fitness": { mainCategory: "🏃 Fitness", subcategory: "Cardio", activityType: null },
  "running": { mainCategory: "🏃 Fitness", subcategory: "Cardio", activityType: "Running" },
  "cycling": { mainCategory: "🏃 Fitness", subcategory: "Cardio", activityType: "Cycling" },
  "swimming": { mainCategory: "🏃 Fitness", subcategory: "Cardio", activityType: "Swimming" },
  "gym": { mainCategory: "🏃 Fitness", subcategory: "Strength Training", activityType: "Weightlifting" },
  "workout": { mainCategory: "🏃 Fitness", subcategory: "Strength Training", activityType: "Bodyweight" },
  "yoga": { mainCategory: "🏃 Fitness", subcategory: "Flexibility", activityType: "Yoga" },
  "basketball": { mainCategory: "🏃 Fitness", subcategory: "Sports", activityType: "Basketball" },
  "tennis": { mainCategory: "🏃 Fitness", subcategory: "Sports", activityType: "Tennis" },
  "soccer": { mainCategory: "🏃 Fitness", subcategory: "Sports", activityType: "Soccer" },

  // Learning categories
  "learning": { mainCategory: "🧠 Learning", subcategory: "Reading", activityType: null },
  "reading": { mainCategory: "🧠 Learning", subcategory: "Reading", activityType: "Books" },
  "study": { mainCategory: "🧠 Learning", subcategory: "Courses", activityType: "Online" },
  "course": { mainCategory: "🧠 Learning", subcategory: "Courses", activityType: "Online" },
  "language": { mainCategory: "🧠 Learning", subcategory: "Languages", activityType: "Practice" },
  "programming": { mainCategory: "🧠 Learning", subcategory: "Skills", activityType: "Programming" },
  "coding": { mainCategory: "🧠 Learning", subcategory: "Skills", activityType: "Programming" },

  // Hobbies categories
  "hobbies": { mainCategory: "🎮 Hobbies", subcategory: "Games", activityType: null },
  "chess": { mainCategory: "🎮 Hobbies", subcategory: "Games", activityType: "Chess" },
  "gaming": { mainCategory: "🎮 Hobbies", subcategory: "Games", activityType: "Video Games" },
  "art": { mainCategory: "🎮 Hobbies", subcategory: "Creative", activityType: "Art" },
  "writing": { mainCategory: "🎮 Hobbies", subcategory: "Creative", activityType: "Writing" },
  "photography": { mainCategory: "🎮 Hobbies", subcategory: "Creative", activityType: "Photography" },
  "music": { mainCategory: "🎮 Hobbies", subcategory: "Music", activityType: "Practice" },
  "cooking": { mainCategory: "🎮 Hobbies", subcategory: "Crafts", activityType: "Cooking" },

  // Work categories
  "work": { mainCategory: "💼 Work", subcategory: "Projects", activityType: null },
  "project": { mainCategory: "💼 Work", subcategory: "Projects", activityType: "Development" },
  "meeting": { mainCategory: "💼 Work", subcategory: "Meetings", activityType: "Team" },
  "email": { mainCategory: "💼 Work", subcategory: "Admin", activityType: "Email" },
  "admin": { mainCategory: "💼 Work", subcategory: "Admin", activityType: "Organization" },

  // Personal categories
  "personal": { mainCategory: "🏠 Personal", subcategory: "Household", activityType: null },
  "health": { mainCategory: "🏠 Personal", subcategory: "Health", activityType: "Wellness" },
  "doctor": { mainCategory: "🏠 Personal", subcategory: "Health", activityType: "Doctor" },
  "cleaning": { mainCategory: "🏠 Personal", subcategory: "Household", activityType: "Cleaning" },
  "shopping": { mainCategory: "🏠 Personal", subcategory: "Household", activityType: "Shopping" },
  "finance": { mainCategory: "🏠 Personal", subcategory: "Finance", activityType: "Budget" },
  "bills": { mainCategory: "🏠 Personal", subcategory: "Finance", activityType: "Bills" },
  "family": { mainCategory: "🏠 Personal", subcategory: "Social", activityType: "Family" },
  "friends": { mainCategory: "🏠 Personal", subcategory: "Social", activityType: "Friends" },
};

// Get all todos that need migration
export const getTodosNeedingMigration = query({
  args: {},
  handler: async (ctx) => {
    const todos = await ctx.db.query("todos").collect();

    // Find todos that have legacy categories but no hierarchical categories
    const todosNeedingMigration = todos.filter(todo =>
      todo.category && !todo.mainCategory
    );

    return {
      total: todos.length,
      needingMigration: todosNeedingMigration.length,
      todos: todosNeedingMigration.map(todo => ({
        _id: todo._id,
        text: todo.text,
        category: todo.category,
        suggestedMapping: todo.category ? CATEGORY_MIGRATION_MAP[todo.category.toLowerCase()] || null : null
      }))
    };
  },
});

// Migrate a single todo to hierarchical categories
export const migrateTodoCategories = mutation({
  args: {
    todoId: v.id("todos"),
    mainCategory: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    activityType: v.optional(v.string()),
    keepLegacyCategory: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId);
    if (!todo) {
      throw new Error("Todo not found");
    }

    const updates: any = {
      mainCategory: args.mainCategory,
      subcategory: args.subcategory,
      activityType: args.activityType,
    };

    // Optionally remove legacy category
    if (!args.keepLegacyCategory) {
      updates.category = undefined;
    }

    await ctx.db.patch(args.todoId, updates);

    return { success: true, todoId: args.todoId };
  },
});

// Bulk migrate todos using the predefined mapping
export const bulkMigrateTodos = mutation({
  args: {
    keepLegacyCategories: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db.query("todos").collect();

    // Find todos that need migration
    const todosToMigrate = todos.filter(todo =>
      todo.category && !todo.mainCategory
    );

    let migratedCount = 0;
    let skippedCount = 0;

    for (const todo of todosToMigrate) {
      const mapping = CATEGORY_MIGRATION_MAP[todo.category?.toLowerCase()];

      if (mapping) {
        const updates: any = {
          mainCategory: mapping.mainCategory,
          subcategory: mapping.subcategory,
          activityType: mapping.activityType,
        };

        // Optionally remove legacy category
        if (!args.keepLegacyCategories) {
          updates.category = undefined;
        }

        await ctx.db.patch(todo._id, updates);
        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    return {
      success: true,
      migratedCount,
      skippedCount,
      totalProcessed: todosToMigrate.length
    };
  },
});

// Smart migration that tries to infer categories from todo text
export const smartMigrateTodos = mutation({
  args: {
    keepLegacyCategories: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db.query("todos").collect();

    // Find todos that need migration
    const todosToMigrate = todos.filter(todo =>
      todo.category && !todo.mainCategory
    );

    let migratedCount = 0;
    let skippedCount = 0;

    for (const todo of todosToMigrate) {
      let mapping = CATEGORY_MIGRATION_MAP[todo.category?.toLowerCase()];

      // If no direct mapping, try to infer from todo text
      if (!mapping) {
        const todoText = todo.text.toLowerCase();

        // Check for fitness keywords
        if (todoText.includes('run') || todoText.includes('jog') || todoText.includes('mile')) {
          mapping = { mainCategory: "🏃 Fitness", subcategory: "Cardio", activityType: "Running" };
        } else if (todoText.includes('gym') || todoText.includes('lift') || todoText.includes('weight')) {
          mapping = { mainCategory: "🏃 Fitness", subcategory: "Strength Training", activityType: "Weightlifting" };
        } else if (todoText.includes('read') || todoText.includes('book') || todoText.includes('page')) {
          mapping = { mainCategory: "🧠 Learning", subcategory: "Reading", activityType: "Books" };
        } else if (todoText.includes('chess') || todoText.includes('puzzle')) {
          mapping = { mainCategory: "🎮 Hobbies", subcategory: "Games", activityType: "Chess" };
        } else if (todoText.includes('work') || todoText.includes('project') || todoText.includes('meeting')) {
          mapping = { mainCategory: "💼 Work", subcategory: "Projects", activityType: "Development" };
        } else if (todoText.includes('clean') || todoText.includes('shop') || todoText.includes('house')) {
          mapping = { mainCategory: "🏠 Personal", subcategory: "Household", activityType: "Cleaning" };
        }
      }

      if (mapping) {
        const updates: any = {
          mainCategory: mapping.mainCategory,
          subcategory: mapping.subcategory,
          activityType: mapping.activityType,
        };

        // Optionally remove legacy category
        if (!args.keepLegacyCategories) {
          updates.category = undefined;
        }

        await ctx.db.patch(todo._id, updates);
        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    return {
      success: true,
      migratedCount,
      skippedCount,
      totalProcessed: todosToMigrate.length
    };
  },
});

// Reset migration (remove hierarchical categories, keep legacy)
export const resetMigration = mutation({
  args: {},
  handler: async (ctx) => {
    const todos = await ctx.db.query("todos").collect();

    let resetCount = 0;

    for (const todo of todos) {
      if (todo.mainCategory || todo.subcategory || todo.activityType) {
        await ctx.db.patch(todo._id, {
          mainCategory: undefined,
          subcategory: undefined,
          activityType: undefined,
        });
        resetCount++;
      }
    }

    return {
      success: true,
      resetCount
    };
  },
});
