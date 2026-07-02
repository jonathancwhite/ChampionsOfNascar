// Local User mirroring (NASCAR-011). Clerk owns identity; we keep a thin `User`
// row so memberships, race participants, and results have a stable local FK.
//
// Two inputs converge on one upsert:
//   - the Clerk webhook payload (`UserJSON`, snake_case) — see the webhook route.
//   - the Clerk backend user from `currentUser()` (camelCase) — see
//     `getOrCreateCurrentUser` in src/lib/auth.ts.

import { clerkClient } from "@clerk/nextjs/server";
import type { UserJSON } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db";

export type LocalUserInput = {
  clerkId: string;
  email: string;
  displayName: string | null;
  imageUrl: string | null;
};

/** Join first/last into a display name, or null when both are empty. */
export function displayNameFrom(
  first?: string | null,
  last?: string | null,
): string | null {
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}

/** Normalize a Clerk webhook `UserJSON` payload to our local shape. */
export function mapWebhookUser(data: UserJSON): LocalUserInput {
  const primary =
    data.email_addresses.find((e) => e.id === data.primary_email_address_id) ??
    data.email_addresses[0];

  return {
    clerkId: data.id,
    // email is unique + required locally; fall back to a stable, non-colliding
    // placeholder if Clerk ever sends a user with no email address.
    email: primary?.email_address || `${data.id}@no-email.invalid`,
    displayName:
      data.username ?? displayNameFrom(data.first_name, data.last_name),
    imageUrl: data.image_url ?? null,
  };
}

/** Idempotent: upsert keyed on the unique `clerkId`, so replays don't dup. */
export async function upsertLocalUser(input: LocalUserInput) {
  const { clerkId, email, displayName, imageUrl } = input;
  const incomingName = displayName?.trim() || null;
  return prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, email, displayName: incomingName, imageUrl },
    // Preserve a locally-set name when Clerk still has no usable display name
    // (e.g. webhook lag or user.updated with empty first/last). Incoming
    // non-blank names always win so Clerk remains source of truth after sync.
    update: {
      email,
      imageUrl,
      ...(incomingName ? { displayName: incomingName } : {}),
    },
  });
}

/**
 * Persist a user-chosen display name locally and in Clerk (NASCAR-086). Clerk
 * is updated first so the next webhook/user sync does not clobber the local row.
 */
export async function updateUserDisplayName(
  userId: string,
  clerkId: string,
  displayName: string,
) {
  const client = await clerkClient();
  await client.users.updateUser(clerkId, {
    firstName: displayName,
    lastName: "",
  });

  return prisma.user.update({
    where: { id: userId },
    data: { displayName },
  });
}

/**
 * Soft-handle a Clerk `user.deleted` event. We deliberately do NOT hard-delete:
 * a deleted user may have historical race results (and may have created a
 * league, whose `creatorId` FK is restrict-on-delete). Instead we keep the row
 * — preserving standings integrity — and strip PII. `updateMany` is idempotent
 * and a no-op when the user is already gone.
 */
export async function anonymizeUserByClerkId(clerkId: string) {
  await prisma.user.updateMany({
    where: { clerkId },
    data: {
      email: `deleted-${clerkId}@removed.invalid`,
      displayName: null,
      imageUrl: null,
    },
  });
}
