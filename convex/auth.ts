import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password],
});

// Helper function to get current user
export async function getCurrentUser(ctx: any) {
  const identity = await auth.getUserIdentity(ctx);
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email))
    .first();

  return user;
}

// Helper function to require authentication
export async function requireAuth(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

// Helper function to check workspace access
export async function checkWorkspaceAccess(
  ctx: any,
  workspaceId: string,
  requiredRole: "owner" | "admin" | "editor" | "viewer" = "viewer"
) {
  const user = await requireAuth(ctx);

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q: any) =>
      q.eq("workspaceId", workspaceId).eq("userId", user._id)
    )
    .first();

  if (!membership) {
    throw new Error("Access denied: Not a member of this workspace");
  }

  const roleHierarchy = {
    viewer: 0,
    editor: 1,
    admin: 2,
    owner: 3
  };

  if (roleHierarchy[membership.role] < roleHierarchy[requiredRole]) {
    throw new Error(`Access denied: ${requiredRole} role required`);
  }

  return { user, membership };
}

// Helper function to check team access
export async function checkTeamAccess(
  ctx: any,
  teamId: string,
  requiredRole: "member" | "lead" = "member"
) {
  const user = await requireAuth(ctx);

  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_team", (q: any) => q.eq("teamId", teamId))
    .filter((q: any) => q.eq(q.field("userId"), user._id))
    .first();

  if (!membership) {
    throw new Error("Access denied: Not a member of this team");
  }

  if (requiredRole === "lead" && membership.role !== "lead") {
    throw new Error("Access denied: Team lead role required");
  }

  return { user, membership };
}
