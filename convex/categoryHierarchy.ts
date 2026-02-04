import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Predefined category hierarchy structure
export const CATEGORY_HIERARCHY = {
  "🏃 Fitness": {
    icon: "🏃",
    color: "#FF6B6B",
    subcategories: [
      {
        name: "Cardio",
        activityTypes: ["Running", "Cycling", "Swimming"],
        icon: "🏃‍♂️",
        color: "#FF8E8E"
      },
      {
        name: "Strength Training",
        activityTypes: ["Weightlifting", "Bodyweight"],
        icon: "💪",
        color: "#FF7575"
      },
      {
        name: "Sports",
        activityTypes: ["Basketball", "Tennis", "Soccer"],
        icon: "⚽",
        color: "#FF9999"
      },
      {
        name: "Flexibility",
        activityTypes: ["Yoga", "Stretching"],
        icon: "🧘‍♀️",
        color: "#FFB3B3"
      }
    ]
  },
  "🧠 Learning": {
    icon: "🧠",
    color: "#4ECDC4",
    subcategories: [
      {
        name: "Reading",
        activityTypes: ["Books", "Articles", "Research"],
        icon: "📚",
        color: "#6ED5CD"
      },
      {
        name: "Courses",
        activityTypes: ["Online", "University", "Certification"],
        icon: "🎓",
        color: "#5ED0C8"
      },
      {
        name: "Languages",
        activityTypes: ["Practice", "Lessons", "Vocabulary"],
        icon: "🗣️",
        color: "#7DDAD3"
      },
      {
        name: "Skills",
        activityTypes: ["Programming", "Design", "Music"],
        icon: "🛠️",
        color: "#8DE0D9"
      }
    ]
  },
  "🎮 Hobbies": {
    icon: "🎮",
    color: "#45B7D1",
    subcategories: [
      {
        name: "Games",
        activityTypes: ["Chess", "Video Games", "Board Games"],
        icon: "🎯",
        color: "#5BC0D6"
      },
      {
        name: "Creative",
        activityTypes: ["Art", "Writing", "Photography"],
        icon: "🎨",
        color: "#6BC5DA"
      },
      {
        name: "Music",
        activityTypes: ["Practice", "Lessons", "Performance"],
        icon: "🎵",
        color: "#7BCADE"
      },
      {
        name: "Crafts",
        activityTypes: ["DIY", "Building", "Cooking"],
        icon: "🔨",
        color: "#8BCFE2"
      }
    ]
  },
  "💼 Work": {
    icon: "💼",
    color: "#96CEB4",
    subcategories: [
      {
        name: "Projects",
        activityTypes: ["Development", "Research", "Planning"],
        icon: "📊",
        color: "#A5D4BD"
      },
      {
        name: "Meetings",
        activityTypes: ["Team", "Client", "Review"],
        icon: "👥",
        color: "#B4DAC6"
      },
      {
        name: "Learning",
        activityTypes: ["Training", "Documentation", "Skills"],
        icon: "📖",
        color: "#C3E0CF"
      },
      {
        name: "Admin",
        activityTypes: ["Email", "Reports", "Organization"],
        icon: "📋",
        color: "#D2E6D8"
      }
    ]
  },
  "🏠 Personal": {
    icon: "🏠",
    color: "#FFEAA7",
    subcategories: [
      {
        name: "Health",
        activityTypes: ["Doctor", "Medication", "Wellness"],
        icon: "🏥",
        color: "#FFECB3"
      },
      {
        name: "Household",
        activityTypes: ["Cleaning", "Maintenance", "Shopping"],
        icon: "🏡",
        color: "#FFEEBF"
      },
      {
        name: "Finance",
        activityTypes: ["Bills", "Budget", "Investment"],
        icon: "💰",
        color: "#FFF0CB"
      },
      {
        name: "Social",
        activityTypes: ["Family", "Friends", "Events"],
        icon: "👨‍👩‍👧‍👦",
        color: "#FFF2D7"
      }
    ]
  }
};

// Get all category hierarchy entries
export const getCategoryHierarchy = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categoryHierarchy")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get category hierarchy by main category
export const getCategoryByMain = query({
  args: { mainCategory: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categoryHierarchy")
      .withIndex("by_main_category", (q) => q.eq("mainCategory", args.mainCategory))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

// Initialize the predefined category hierarchy
export const initializeCategoryHierarchy = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if hierarchy already exists
    const existing = await ctx.db.query("categoryHierarchy").collect();
    if (existing.length > 0) {
      return { message: "Category hierarchy already initialized" };
    }

    // Insert predefined categories
    const insertPromises = Object.entries(CATEGORY_HIERARCHY).map(([mainCategory, data]) => {
      return ctx.db.insert("categoryHierarchy", {
        mainCategory,
        subcategories: data.subcategories,
        icon: data.icon,
        color: data.color,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    await Promise.all(insertPromises);
    return { message: "Category hierarchy initialized successfully" };
  },
});

// Add a new main category
export const addMainCategory = mutation({
  args: {
    mainCategory: v.string(),
    icon: v.string(),
    color: v.string(),
    subcategories: v.array(v.object({
      name: v.string(),
      activityTypes: v.array(v.string()),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("categoryHierarchy", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Update a main category
export const updateMainCategory = mutation({
  args: {
    id: v.id("categoryHierarchy"),
    mainCategory: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    subcategories: v.optional(v.array(v.object({
      name: v.string(),
      activityTypes: v.array(v.string()),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
    }))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a main category
export const deleteMainCategory = mutation({
  args: { id: v.id("categoryHierarchy") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Get subcategories for a main category
export const getSubcategories = query({
  args: { mainCategory: v.string() },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categoryHierarchy")
      .withIndex("by_main_category", (q) => q.eq("mainCategory", args.mainCategory))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return category?.subcategories || [];
  },
});

// Get activity types for a subcategory
export const getActivityTypes = query({
  args: {
    mainCategory: v.string(),
    subcategory: v.string()
  },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categoryHierarchy")
      .withIndex("by_main_category", (q) => q.eq("mainCategory", args.mainCategory))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!category) return [];

    const subcategoryData = category.subcategories.find(sub => sub.name === args.subcategory);
    return subcategoryData?.activityTypes || [];
  },
});

// Get flattened category options for dropdowns
export const getCategoryOptions = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categoryHierarchy")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const mainCategories = categories.map(cat => ({
      value: cat.mainCategory,
      label: cat.mainCategory,
      icon: cat.icon,
      color: cat.color
    }));

    const subcategoriesByMain = [];
    const activityTypesBySubcategory = [];

    categories.forEach(cat => {
      subcategoriesByMain.push({
        mainCategory: cat.mainCategory,
        subcategories: cat.subcategories.map(sub => ({
          value: sub.name,
          label: sub.name,
          icon: sub.icon,
          color: sub.color
        }))
      });

      cat.subcategories.forEach(sub => {
        activityTypesBySubcategory.push({
          mainCategory: cat.mainCategory,
          subcategory: sub.name,
          activityTypes: sub.activityTypes.map(type => ({
            value: type,
            label: type
          }))
        });
      });
    });

    return {
      mainCategories,
      subcategoriesByMain,
      activityTypesBySubcategory
    };
  },
});
