// Server-side auth helpers (NASCAR-010 / NASCAR-011). Thin wrappers over Clerk
// so route handlers, server components, and server actions have one import for
// "who is signed in" and "get the local User row".
//
// Per-league authorization (`requireLeagueRole`) lands with NASCAR-022/060.

import { auth, currentUser } from "@clerk/nextjs/server";

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
