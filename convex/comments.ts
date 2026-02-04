import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./auth";

// Add a comment to a todo or section
export const addComment = mutation({
  args: {
    todoId: v.optional(v.id("todos")),
    sectionId: v.optional(v.id("sections")),
    content: v.string(),
    mentions: v.optional(v.array(v.id("users"))),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    if (!args.todoId && !args.sectionId) {
      throw new Error("Either todoId or sectionId must be provided");
    }

    // Verify access to the todo or section
    if (args.todoId) {
      const todo = await ctx.db.get(args.todoId);
      if (!todo) {
        throw new Error("Todo not found");
      }
      // TODO: Add permission check for todo access
    }

    if (args.sectionId) {
      const section = await ctx.db.get(args.sectionId);
      if (!section) {
        throw new Error("Section not found");
      }
      // TODO: Add permission check for section access
    }

    const commentId = await ctx.db.insert("comments", {
      todoId: args.todoId,
      sectionId: args.sectionId,
      authorId: user._id,
      content: args.content,
      mentions: args.mentions,
      parentCommentId: args.parentCommentId,
      isEdited: false,
      createdAt: Date.now(),
    });

    // Create notifications for mentioned users
    if (args.mentions && args.mentions.length > 0) {
      for (const mentionedUserId of args.mentions) {
        await ctx.db.insert("notifications", {
          userId: mentionedUserId,
          type: "mention",
          title: "You were mentioned in a comment",
          message: `${user.name} mentioned you in a comment: "${args.content.substring(0, 100)}${args.content.length > 100 ? '...' : ''}"`,
          isRead: false,
          actionUrl: args.todoId ? `/todos/${args.todoId}` : `/sections/${args.sectionId}`,
          relatedId: commentId,
          createdAt: Date.now(),
        });
      }
    }

    // Create activity log
    await ctx.db.insert("activities", {
      type: "comment_added",
      actorId: user._id,
      targetId: args.todoId || args.sectionId,
      targetType: args.todoId ? "todo" : "section",
      metadata: {
        commentId,
        content: args.content.substring(0, 200),
      },
      createdAt: Date.now(),
    });

    return commentId;
  },
});

// Get comments for a todo or section
export const getComments = query({
  args: {
    todoId: v.optional(v.id("todos")),
    sectionId: v.optional(v.id("sections")),
  },
  handler: async (ctx, args) => {
    if (!args.todoId && !args.sectionId) {
      throw new Error("Either todoId or sectionId must be provided");
    }

    let comments;
    if (args.todoId) {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_todo", (q) => q.eq("todoId", args.todoId))
        .collect();
    } else {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
        .collect();
    }

    // Get author information for each comment
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        const mentionedUsers = comment.mentions
          ? await Promise.all(comment.mentions.map(id => ctx.db.get(id)))
          : [];

        return {
          ...comment,
          author,
          mentionedUsers: mentionedUsers.filter(Boolean),
        };
      })
    );

    // Sort by creation time
    return commentsWithAuthors.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Edit a comment
export const editComment = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
    mentions: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const comment = await ctx.db.get(args.commentId);

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.authorId !== user._id) {
      throw new Error("You can only edit your own comments");
    }

    await ctx.db.patch(args.commentId, {
      content: args.content,
      mentions: args.mentions,
      isEdited: true,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// Delete a comment
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const comment = await ctx.db.get(args.commentId);

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.authorId !== user._id) {
      throw new Error("You can only delete your own comments");
    }

    // Delete all child comments first
    const childComments = await ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentCommentId", args.commentId))
      .collect();

    for (const childComment of childComments) {
      await ctx.db.delete(childComment._id);
    }

    await ctx.db.delete(args.commentId);
    return true;
  },
});

// Get user notifications
export const getUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const limit = args.limit || 50;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Mark notification as read
export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new Error("You can only mark your own notifications as read");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return true;
  },
});

// Mark all notifications as read
export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
      });
    }

    return unreadNotifications.length;
  },
});

// Get activity feed for workspace or team
export const getActivityFeed = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    let activities;

    if (args.workspaceId) {
      activities = await ctx.db
        .query("activities")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .order("desc")
        .take(limit);
    } else if (args.teamId) {
      activities = await ctx.db
        .query("activities")
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
        .order("desc")
        .take(limit);
    } else {
      // Get all activities for the user
      activities = await ctx.db
        .query("activities")
        .withIndex("by_created_at")
        .order("desc")
        .take(limit);
    }

    // Get actor information for each activity
    const activitiesWithActors = await Promise.all(
      activities.map(async (activity) => {
        const actor = await ctx.db.get(activity.actorId);
        return {
          ...activity,
          actor,
        };
      })
    );

    return activitiesWithActors;
  },
});

// Create activity log entry
export const createActivity = mutation({
  args: {
    type: v.union(
      v.literal("todo_created"),
      v.literal("todo_completed"),
      v.literal("todo_assigned"),
      v.literal("comment_added"),
      v.literal("user_mentioned"),
      v.literal("team_joined"),
      v.literal("workspace_created")
    ),
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const activityId = await ctx.db.insert("activities", {
      type: args.type,
      actorId: user._id,
      workspaceId: args.workspaceId,
      teamId: args.teamId,
      targetId: args.targetId,
      targetType: args.targetType,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return activityId;
  },
});
