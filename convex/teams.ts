import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, checkWorkspaceAccess } from "./auth";

// Create a new workspace
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      description: args.description,
      ownerId: user._id,
      settings: {
        isPublic: false,
        allowInvites: true,
        defaultRole: "viewer",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Add the creator as owner
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: user._id,
      role: "owner",
      joinedAt: Date.now(),
    });

    return workspaceId;
  },
});

// Get user's workspaces
export const getUserWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const workspaces = await Promise.all(
      memberships.map(async (membership) => {
        const workspace = await ctx.db.get(membership.workspaceId);
        return {
          ...workspace,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      })
    );

    return workspaces.filter(Boolean);
  },
});

// Create a team within a workspace
export const createTeam = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "editor");
    const user = await requireAuth(ctx);

    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      description: args.description,
      workspaceId: args.workspaceId,
      ownerId: user._id,
      color: args.color,
      createdAt: Date.now(),
    });

    // Add the creator as team lead
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: user._id,
      role: "lead",
      joinedAt: Date.now(),
    });

    return teamId;
  },
});

// Get teams in a workspace
export const getWorkspaceTeams = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId);

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return teams;
  },
});

// Invite user to workspace
export const inviteToWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");
    const user = await requireAuth(ctx);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Check if already a member
      const existingMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", existingUser._id)
        )
        .first();

      if (existingMembership) {
        throw new Error("User is already a member of this workspace");
      }

      // Add directly as member
      await ctx.db.insert("workspaceMembers", {
        workspaceId: args.workspaceId,
        userId: existingUser._id,
        role: args.role,
        invitedBy: user._id,
        joinedAt: Date.now(),
      });

      return { type: "direct_add", userId: existingUser._id };
    } else {
      // Create invitation
      const token = Math.random().toString(36).substring(2, 15) +
                   Math.random().toString(36).substring(2, 15);

      await ctx.db.insert("invitations", {
        email: args.email,
        workspaceId: args.workspaceId,
        role: args.role,
        invitedBy: user._id,
        token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        createdAt: Date.now(),
      });

      return { type: "invitation_sent", token };
    }
  },
});

// Accept workspace invitation
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    if (invitation.expiresAt < Date.now()) {
      throw new Error("Invitation has expired");
    }

    if (invitation.acceptedAt) {
      throw new Error("Invitation has already been accepted");
    }

    // Check if user email matches invitation
    if (user.email !== invitation.email) {
      throw new Error("Invitation email does not match your account");
    }

    // Add user to workspace
    await ctx.db.insert("workspaceMembers", {
      workspaceId: invitation.workspaceId,
      userId: user._id,
      role: invitation.role as any,
      invitedBy: invitation.invitedBy,
      joinedAt: Date.now(),
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      acceptedAt: Date.now(),
    });

    return invitation.workspaceId;
  },
});

// Add user to team
export const addTeamMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("lead"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    await checkWorkspaceAccess(ctx, team.workspaceId, "editor");

    // Check if user is already a team member
    const existingMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingMembership) {
      throw new Error("User is already a member of this team");
    }

    await ctx.db.insert("teamMembers", {
      teamId: args.teamId,
      userId: args.userId,
      role: args.role,
      joinedAt: Date.now(),
    });

    return true;
  },
});

// Get team members
export const getTeamMembers = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    await checkWorkspaceAccess(ctx, team.workspaceId);

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return {
          ...user,
          teamRole: membership.role,
          joinedAt: membership.joinedAt,
        };
      })
    );

    return members.filter(Boolean);
  },
});

// Get workspace members
export const getWorkspaceMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId);

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return {
          ...user,
          workspaceRole: membership.role,
          joinedAt: membership.joinedAt,
          invitedBy: membership.invitedBy,
        };
      })
    );

    return members.filter(Boolean);
  },
});

// Remove team member
export const removeTeamMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    await checkWorkspaceAccess(ctx, team.workspaceId, "editor");

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!membership) {
      throw new Error("User is not a member of this team");
    }

    await ctx.db.delete(membership._id);
    return true;
  },
});

// Update workspace settings
export const updateWorkspaceSettings = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    settings: v.object({
      isPublic: v.optional(v.boolean()),
      allowInvites: v.optional(v.boolean()),
      defaultRole: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, "admin");

    await ctx.db.patch(args.workspaceId, {
      settings: args.settings,
      updatedAt: Date.now(),
    });

    return true;
  },
});
