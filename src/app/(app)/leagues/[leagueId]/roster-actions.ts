"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { LeagueRole } from "@/generated/prisma/enums";
import { getOrCreateCurrentUser, requireLeagueRole } from "@/lib/auth";
import {
  leaveLeague,
  promoteToAdmin,
  removeMember,
  transferOwnership,
  type RosterResult,
} from "@/lib/roster";

// Roster management server actions (NASCAR-032). Called imperatively from the
// client RosterManager. Every admin action re-checks ADMIN authorization
// server-side — never trust the client — then revalidates the overview.
export type RosterActionState = { ok?: boolean; error?: string };

function denied(reason: "unauthenticated" | string): RosterActionState {
  return {
    error:
      reason === "unauthenticated"
        ? "You must be signed in."
        : "Only admins can manage this league's roster.",
  };
}

async function adminAction(
  leagueId: string,
  op: () => Promise<RosterResult>,
): Promise<RosterActionState> {
  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) return denied(authz.reason);

  const result = await op();
  if (!result.ok) return { error: result.error };

  revalidatePath(`/leagues/${leagueId}`);
  return { ok: true };
}

export async function removeMemberAction(
  leagueId: string,
  membershipId: string,
): Promise<RosterActionState> {
  return adminAction(leagueId, () => removeMember(leagueId, membershipId));
}

export async function promoteMemberAction(
  leagueId: string,
  membershipId: string,
): Promise<RosterActionState> {
  return adminAction(leagueId, () => promoteToAdmin(leagueId, membershipId));
}

export async function transferOwnershipAction(
  leagueId: string,
  membershipId: string,
): Promise<RosterActionState> {
  return adminAction(leagueId, () => transferOwnership(leagueId, membershipId));
}

/** Self-leave: any member except the creator. Redirects to the dashboard. */
export async function leaveLeagueAction(
  leagueId: string,
): Promise<RosterActionState> {
  const user = await getOrCreateCurrentUser();
  if (!user) return denied("unauthenticated");

  // Asserting membership (any role) is enough — self-leave needs no ADMIN.
  const membership = await requireLeagueRole(leagueId, LeagueRole.MEMBER);
  if (!membership.ok) return denied(membership.reason);

  const result = await leaveLeague(leagueId, user.id);
  if (!result.ok) return { error: result.error };

  redirect("/dashboard");
}
