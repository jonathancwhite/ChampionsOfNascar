// Server-side auth helpers (NASCAR-010 / NASCAR-011). Thin wrappers over Clerk
// so route handlers, server components, and server actions have one import for
// "who is signed in" and "get the local User row" — plus per-league
// authorization (`requireLeagueRole`, NASCAR-022).

import { auth, currentUser } from "@clerk/nextjs/server";

import { LeagueRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { displayNameFrom, upsertLocalUser } from "@/lib/users";

export { auth };

/** The signed-in Clerk user, or `null` when unauthenticated. */
export async function getCurrentUser() {
  return currentUser();
}

/**
 * Clerk user id for the current request, or `null`. Protected routes are
 * already gated by middleware, so inside them this is non-null.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * The local `User` row for the signed-in user, upserting it from Clerk claims
 * if absent. Defensive safety net for webhook lag (NASCAR-011): the very first
 * authenticated request after sign-up still gets a local row even if the
 * `user.created` webhook hasn't arrived yet. Returns `null` when unauthenticated.
 */
export async function getOrCreateCurrentUser() {
  const user = await currentUser();
  if (!user) return null;

  const primary =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ??
    user.emailAddresses[0];

  return upsertLocalUser({
    clerkId: user.id,
    email: primary?.emailAddress || `${user.id}@no-email.invalid`,
    displayName:
      user.username ?? displayNameFrom(user.firstName, user.lastName),
    imageUrl: user.imageUrl ?? null,
  });
}

export type LeagueRoleCheck =
  | {
      ok: true;
      userId: string;
      membershipId: string;
      role: LeagueRole;
    }
  | {
      ok: false;
      reason: "unauthenticated" | "not-member" | "insufficient-role";
    };

/**
 * Shared per-league authorization (NASCAR-022). Loads the current user and
 * their membership, then checks the required role. The single gate behind every
 * admin page and action — callers map the `reason` to a redirect / 404 / 403 or
 * an error state. Requiring MEMBER just asserts membership; ADMIN requires the
 * ADMIN role.
 */
export async function requireLeagueRole(
  leagueId: string,
  role: LeagueRole,
): Promise<LeagueRoleCheck> {
  const user = await getOrCreateCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
    select: { id: true, role: true },
  });
  if (!membership) return { ok: false, reason: "not-member" };

  if (role === LeagueRole.ADMIN && membership.role !== LeagueRole.ADMIN) {
    return { ok: false, reason: "insufficient-role" };
  }

  return {
    ok: true,
    userId: user.id,
    membershipId: membership.id,
    role: membership.role,
  };
}
