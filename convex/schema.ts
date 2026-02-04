import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Authentication tables
  ...authTables,

  // User profiles and workspace management
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatar: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("viewer")),
    preferences: v.optional(v.object({
      theme: v.optional(v.string()),
      notifications: v.optional(v.boolean()),
      timezone: v.optional(v.string()),
    })),
    lastActive: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    settings: v.optional(v.object({
      isPublic: v.optional(v.boolean()),
      allowInvites: v.optional(v.boolean()),
      defaultRole: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("editor"), v.literal("viewer")),
    invitedBy: v.optional(v.id("users")),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  teams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    ownerId: v.id("users"),
    color: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_owner", ["ownerId"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("lead"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"]),

  sections: defineTable({
    title: v.string(),
    workspaceId: v.optional(v.id("workspaces")), // null for personal sections
    teamId: v.optional(v.id("teams")), // null for workspace-wide sections
    ownerId: v.optional(v.id("users")), // Made optional for backward compatibility
    isShared: v.optional(v.boolean()),
    permissions: v.optional(v.object({
      canEdit: v.array(v.id("users")),
      canView: v.array(v.id("users")),
    })),
    columns: v.array(
      v.object({
        name: v.string(),
        type: v.string(), // "text", "number", "dropdown"
        options: v.optional(v.array(v.string())),
        allowMultiple: v.optional(v.boolean()),
      })
    ),
    entries: v.array(v.any()),
    createdAt: v.optional(v.number()), // Made optional for backward compatibility
    updatedAt: v.optional(v.number()), // Made optional for backward compatibility
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"])
    .index("by_owner", ["ownerId"]),

  todos: defineTable({
    text: v.string(),
    done: v.boolean(),
    doneAt: v.optional(v.number()),
    deadline: v.optional(v.string()),
    dueTime: v.optional(v.string()), // Time component for due date
    position: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    // Hierarchical category system
    mainCategory: v.optional(v.string()), // Fitness, Learning, Hobbies, Work, Personal
    subcategory: v.optional(v.string()), // Cardio, Reading, Games, etc.
    activityType: v.optional(v.string()), // Running, Books, Chess, etc.

    // Legacy category field for backward compatibility
    category: v.optional(v.string()),

    // Collaboration fields
    workspaceId: v.optional(v.id("workspaces")), // null for personal todos
    teamId: v.optional(v.id("teams")), // null for workspace-wide todos
    ownerId: v.optional(v.id("users")), // Made optional for backward compatibility
    assignedTo: v.optional(v.array(v.id("users"))), // Multiple assignees
    isShared: v.optional(v.boolean()),
    permissions: v.optional(v.object({
      canEdit: v.array(v.id("users")),
      canView: v.array(v.id("users")),
    })),

    // Time tracking fields
    estimatedMinutes: v.optional(v.number()),
    actualMinutes: v.optional(v.number()),
    timerStarted: v.optional(v.number()), // Timestamp when timer started
    timerSessions: v.optional(v.array(v.object({
      startTime: v.number(),
      endTime: v.number(),
      duration: v.number(),
      userId: v.optional(v.id("users")), // Who tracked the time
    }))),

    // Recurring task fields
    isRecurring: v.optional(v.boolean()),
    recurringPattern: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("custom")
    )),
    recurringInterval: v.optional(v.number()), // For custom intervals
    recurringDays: v.optional(v.array(v.number())), // Days of week for weekly (0=Sunday)
    parentRecurringId: v.optional(v.id("todos")), // Links to original recurring task
    nextDueDate: v.optional(v.string()), // Next occurrence for recurring tasks

    // Enhanced management fields
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    dependencies: v.optional(v.array(v.id("todos"))), // Tasks that must be completed first
    parentId: v.optional(v.id("todos")), // For subtasks
    subtasks: v.optional(v.array(v.id("todos"))), // Child tasks

    // Template fields
    isTemplate: v.optional(v.boolean()),
    templateName: v.optional(v.string()),

    // Analytics fields
    completedAt: v.optional(v.number()), // Timestamp when completed
    timeSpent: v.optional(v.number()), // Total time spent in minutes
    productivityScore: v.optional(v.number()), // Calculated productivity score
    createdAt: v.optional(v.number()), // Creation timestamp
    updatedAt: v.optional(v.number()),
    lastEditedBy: v.optional(v.id("users")),

    // Activity tracking fields
    activityCategory: v.optional(v.string()), // Links to activity sections
    activityMetrics: v.optional(v.any()), // Extracted metrics from todo text
    autoTrackSection: v.optional(v.id("sections")), // Target section for auto-tracking
    extractedMetrics: v.optional(v.object({
      values: v.array(v.object({
        type: v.string(), // "puzzles", "minutes", "pages", etc.
        value: v.number(),
        unit: v.string(),
      })),
      confidence: v.optional(v.number()), // Confidence in extraction
    })),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"])
    .index("by_owner", ["ownerId"])
    .index("by_assigned", ["assignedTo"]),

  // Todo templates table
  todoTemplates: defineTable({
    name: v.string(),
    text: v.string(),
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    // Hierarchical category system
    mainCategory: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    activityType: v.optional(v.string()),

    // Legacy category field for backward compatibility
    category: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
    ownerId: v.optional(v.id("users")), // Made optional for backward compatibility
    isShared: v.optional(v.boolean()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_owner", ["ownerId"]),

  // Comments and mentions system
  comments: defineTable({
    todoId: v.optional(v.id("todos")),
    sectionId: v.optional(v.id("sections")),
    authorId: v.id("users"),
    content: v.string(),
    mentions: v.optional(v.array(v.id("users"))),
    parentCommentId: v.optional(v.id("comments")), // For threaded comments
    isEdited: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_todo", ["todoId"])
    .index("by_section", ["sectionId"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentCommentId"]),

  // Activity feed and notifications
  activities: defineTable({
    type: v.union(
      v.literal("todo_created"),
      v.literal("todo_completed"),
      v.literal("todo_assigned"),
      v.literal("comment_added"),
      v.literal("user_mentioned"),
      v.literal("team_joined"),
      v.literal("workspace_created")
    ),
    actorId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    targetId: v.optional(v.string()), // ID of the target object (todo, comment, etc.)
    targetType: v.optional(v.string()), // Type of the target object
    metadata: v.optional(v.any()), // Additional context data
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"])
    .index("by_actor", ["actorId"])
    .index("by_created_at", ["createdAt"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("mention"),
      v.literal("assignment"),
      v.literal("comment"),
      v.literal("deadline"),
      v.literal("team_invite")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    actionUrl: v.optional(v.string()),
    relatedId: v.optional(v.string()), // ID of related object
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"]),

  // Third-party integrations
  integrations: defineTable({
    workspaceId: v.id("workspaces"),
    type: v.union(
      v.literal("google_calendar"),
      v.literal("slack"),
      v.literal("github"),
      v.literal("outlook"),
      v.literal("zapier")
    ),
    name: v.string(),
    config: v.any(), // Integration-specific configuration
    credentials: v.optional(v.any()), // Encrypted credentials
    isActive: v.boolean(),
    lastSync: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_type", ["type"]),

  webhooks: defineTable({
    workspaceId: v.id("workspaces"),
    url: v.string(),
    events: v.array(v.string()), // Events to trigger webhook
    secret: v.optional(v.string()),
    isActive: v.boolean(),
    lastTriggered: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  // Smart automation and AI features
  automationRules: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    trigger: v.object({
      type: v.string(), // "todo_created", "deadline_approaching", etc.
      conditions: v.any(),
    }),
    actions: v.array(v.object({
      type: v.string(), // "assign_user", "set_priority", "send_notification"
      parameters: v.any(),
    })),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  aiSuggestions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("task_categorization"),
      v.literal("deadline_suggestion"),
      v.literal("priority_suggestion"),
      v.literal("similar_tasks")
    ),
    targetId: v.string(), // ID of the target object
    suggestion: v.any(), // The AI suggestion data
    confidence: v.number(), // Confidence score 0-1
    isAccepted: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_target", ["targetId"]),

  // Goals table for goal setting and tracking
  goals: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    ),
    targetType: v.union(
      v.literal("tasks_completed"),
      v.literal("time_spent"),
      v.literal("category_focus")
    ),
    targetValue: v.number(),
    targetCategory: v.optional(v.string()), // For category-specific goals
    currentProgress: v.optional(v.number()),
    isActive: v.boolean(),
    workspaceId: v.optional(v.id("workspaces")),
    ownerId: v.optional(v.id("users")), // Made optional for backward compatibility
    createdAt: v.number(),
    startDate: v.string(), // ISO date string
    endDate: v.string(), // ISO date string
    completedAt: v.optional(v.number()),
    streak: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_owner", ["ownerId"]),

  // Productivity sessions for detailed analytics
  productivitySessions: defineTable({
    date: v.string(), // ISO date string (YYYY-MM-DD)
    userId: v.optional(v.id("users")), // Made optional for backward compatibility
    workspaceId: v.optional(v.id("workspaces")),
    tasksCompleted: v.number(),
    tasksCreated: v.number(),
    totalTimeSpent: v.number(), // in minutes
    highPriorityCompleted: v.number(),
    mediumPriorityCompleted: v.number(),
    lowPriorityCompleted: v.number(),
    categoriesWorked: v.array(v.string()),
    productivityScore: v.number(), // Calculated daily score
    peakHours: v.optional(v.array(v.number())), // Hours of peak productivity
    focusSessionsCount: v.optional(v.number()),
    averageTaskDuration: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_date", ["date"]),

  // Analytics insights cache
  analyticsInsights: defineTable({
    type: v.union(
      v.literal("weekly_summary"),
      v.literal("monthly_summary"),
      v.literal("productivity_pattern"),
      v.literal("category_performance")
    ),
    period: v.string(), // e.g., "2024-W01" for weekly, "2024-01" for monthly
    userId: v.optional(v.id("users")),
    workspaceId: v.optional(v.id("workspaces")),
    data: v.any(), // Flexible data structure for different insight types
    generatedAt: v.number(),
    expiresAt: v.number(), // Cache expiration
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_type_period", ["type", "period"]),

  // Enterprise features
  auditLogs: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    action: v.string(), // "create", "update", "delete", "login", etc.
    resourceType: v.string(), // "todo", "user", "workspace", etc.
    resourceId: v.optional(v.string()),
    details: v.optional(v.any()), // Additional context
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  invitations: defineTable({
    email: v.string(),
    workspaceId: v.id("workspaces"),
    teamId: v.optional(v.id("teams")),
    role: v.string(),
    invitedBy: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_workspace", ["workspaceId"]),

  // Hierarchical category structure
  categoryHierarchy: defineTable({
    mainCategory: v.string(), // Fitness, Learning, Hobbies, Work, Personal
    subcategories: v.array(v.object({
      name: v.string(), // Cardio, Reading, Games, etc.
      activityTypes: v.array(v.string()), // Running, Books, Chess, etc.
      icon: v.optional(v.string()), // Optional icon for subcategory
      color: v.optional(v.string()), // Optional color for subcategory
    })),
    icon: v.string(), // Emoji icon for main category
    color: v.string(), // Color for main category
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_main_category", ["mainCategory"])
    .index("by_active", ["isActive"]),

  // Activity category mappings for auto-tracking (updated for hierarchical categories)
  activityCategoryMappings: defineTable({
    name: v.string(), // Display name for the mapping
    // Hierarchical category matching
    mainCategory: v.optional(v.string()), // Main category to match
    subcategory: v.optional(v.string()), // Subcategory to match
    activityType: v.optional(v.string()), // Activity type to match
    // Legacy category field for backward compatibility
    todoCategory: v.optional(v.string()), // Legacy todo category that triggers this mapping
    targetSectionId: v.id("sections"), // Section to add entries to
    columnMappings: v.array(v.object({
      metricType: v.string(), // "puzzles", "minutes", "pages", etc.
      columnName: v.string(), // Target column name in section
      defaultValue: v.optional(v.number()), // Default value if not extracted
    })),
    extractionRules: v.array(v.object({
      pattern: v.string(), // Regex pattern to match
      metricType: v.string(), // Type of metric this pattern extracts
      unit: v.string(), // Unit for the metric
    })),
    isActive: v.boolean(),
    workspaceId: v.optional(v.id("workspaces")),
    ownerId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_owner", ["ownerId"])
    .index("by_todo_category", ["todoCategory"]),

  // Metric extraction rules and templates
  metricExtractionRules: defineTable({
    name: v.string(), // Rule name
    category: v.string(), // Activity category this applies to
    patterns: v.array(v.object({
      regex: v.string(), // Regex pattern
      metricType: v.string(), // Type of metric (puzzles, minutes, etc.)
      unit: v.string(), // Unit name
      multiplier: v.optional(v.number()), // Multiplier for unit conversion
    })),
    priority: v.number(), // Rule priority (higher = checked first)
    isGlobal: v.boolean(), // Available to all users vs workspace-specific
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_category", ["category"])
    .index("by_priority", ["priority"]),

  // Activity category templates for common activities
  activityCategoryTemplates: defineTable({
    name: v.string(), // Template name (e.g., "Chess Training", "Reading Log")
    description: v.optional(v.string()),
    category: v.string(), // Activity category
    sectionTemplate: v.object({
      title: v.string(),
      columns: v.array(v.object({
        name: v.string(),
        type: v.string(),
        options: v.optional(v.array(v.string())),
      })),
    }),
    defaultMappings: v.array(v.object({
      metricType: v.string(),
      columnName: v.string(),
    })),
    extractionRules: v.array(v.object({
      pattern: v.string(),
      metricType: v.string(),
      unit: v.string(),
    })),
    isBuiltIn: v.boolean(), // Built-in templates vs user-created
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    usageCount: v.optional(v.number()), // Track popularity
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_category", ["category"])
    .index("by_usage", ["usageCount"]),
});
