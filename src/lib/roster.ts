// Roster management (NASCAR-032): admin remove / promote / transfer-ownership
// and self-leave. Removal is a soft delete (sets removedAt) so a member's
// historical RaceParticipant/RaceResult rows survive for standings; the access
// gates filter `removedAt: null`. Authorization is the caller's responsibility
// (the server actions re-check requireLeagueRole); these functions enforce the
// *rules* — the creator can't be removed and can't leave without transferring.

import { LeagueRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

export type RosterResult = { ok: true } | { ok: false; error: string };

type Target = {
  creatorId: string;
  membership: { id: string; userId: string; removedAt: Date | null } | null;
};

/** League owner + the target membership (scoped to the league), or null league. */
async function loadTarget(
  leagueId: string,
  membershipId: string,
): Promise<Target | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { creatorId: true },
  });
  if (!league) return null;

  const membership = await prisma.leagueMembership.findFirst({
    where: { id: membershipId, leagueId },
    select: { id: true, userId: true, removedAt: true },
  });
  return { creatorId: league.creatorId, membership };
}

const NOT_IN_LEAGUE = {
  ok: false,
  error: "That member is not in this league.",
} as const;

/** Admin removes a member. The league owner (creator) cannot be removed. */
export async function removeMember(
  leagueId: string,
  membershipId: string,
): Promise<RosterResult> {
  const target = await loadTarget(leagueId, membershipId);
  if (!target?.membership || target.membership.removedAt) return NOT_IN_LEAGUE;
  if (target.membership.userId === target.creatorId) {
    return { ok: false, error: "The league owner cannot be removed." };
  }

  await prisma.leagueMembership.update({
    where: { id: membershipId },
    data: { removedAt: new Date() },
  });
  return { ok: true };
}

/** Admin promotes a member to ADMIN. */
export async function promoteToAdmin(
  leagueId: string,
  membershipId: string,
): Promise<RosterResult> {
  const target = await loadTarget(leagueId, membershipId);
  if (!target?.membership || target.membership.removedAt) return NOT_IN_LEAGUE;

  await prisma.leagueMembership.update({
    where: { id: membershipId },
    data: { role: LeagueRole.ADMIN },
  });
  return { ok: true };
}

/**
 * Admin transfers league ownership to another member: that member becomes the
 * new creator and an ADMIN. The previous owner keeps their ADMIN role.
 */
export async function transferOwnership(
  leagueId: string,
  membershipId: string,
): Promise<RosterResult> {
  const target = await loadTarget(leagueId, membershipId);
  if (!target?.membership || target.membership.removedAt) return NOT_IN_LEAGUE;
  if (target.membership.userId === target.creatorId) {
    return { ok: false, error: "That member already owns this league." };
  }

  await prisma.$transaction([
    prisma.league.update({
      where: { id: leagueId },
      data: { creatorId: target.membership.userId },
    }),
    prisma.leagueMembership.update({
      where: { id: membershipId },
      data: { role: LeagueRole.ADMIN },
    }),
  ]);
  return { ok: true };
}

/**
 * A member leaves a league (self-service). The owner must transfer ownership
 * first, otherwise the league would be left without a creator.
 */
export async function leaveLeague(
  leagueId: string,
  userId: string,
): Promise<RosterResult> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { creatorId: true },
  });
  if (!league) return { ok: false, error: "League not found." };
  if (league.creatorId === userId) {
    return {
      ok: false,
      error: "Transfer ownership to another member before leaving.",
    };
  }

  await prisma.leagueMembership.updateMany({
    where: { leagueId, userId, removedAt: null },
    data: { removedAt: new Date() },
  });
  return { ok: true };
}
