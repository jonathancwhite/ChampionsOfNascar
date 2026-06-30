// League read-side queries (NASCAR-021 dashboard/overview, NASCAR-042 schedule,
// NASCAR-070 standings). All are membership-scoped: a query returns null/empty
// for a user who doesn't belong to the league, so callers can 404 non-members.

import { LeagueRole, RaceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { computeStandings, type StandingEntry } from "@/lib/standings";

/** Display name for a participant, AI or human, with sensible fallbacks. */
function driverName(args: {
  isAi: boolean;
  aiName: string | null;
  membershipDisplayName?: string | null;
  userDisplayName?: string | null;
}): string {
  if (args.isAi) return args.aiName?.trim() || "AI Driver";
  return (
    args.membershipDisplayName?.trim() ||
    args.userDisplayName?.trim() ||
    "Driver"
  );
}

/**
 * The current user's membership in a league (with role), or null if they are
 * not a member. The shared gate behind every league page's access control.
 */
export async function requireLeagueMembership(
  leagueId: string,
  userId: string,
) {
  return prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
    select: { id: true, role: true },
  });
}

export type DashboardLeague = {
  id: string;
  name: string;
  series: string;
  numberOfRaces: number;
  status: string;
  role: LeagueRole;
  memberCount: number;
  nextRace: { round: number; trackName: string; scheduledAt: Date } | null;
};

/** Leagues the user belongs to, each with its next upcoming dated race. */
export async function getDashboardLeagues(
  userId: string,
  now: Date,
): Promise<DashboardLeague[]> {
  const memberships = await prisma.leagueMembership.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      role: true,
      league: {
        select: {
          id: true,
          name: true,
          series: true,
          numberOfRaces: true,
          status: true,
          _count: { select: { memberships: true } },
          races: {
            where: {
              status: RaceStatus.SCHEDULED,
              scheduledAt: { gte: now },
            },
            orderBy: { scheduledAt: "asc" },
            take: 1,
            select: {
              round: true,
              scheduledAt: true,
              track: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return memberships.map(({ role, league }) => {
    const upcoming = league.races[0];
    return {
      id: league.id,
      name: league.name,
      series: league.series,
      numberOfRaces: league.numberOfRaces,
      status: league.status,
      role,
      memberCount: league._count.memberships,
      nextRace:
        upcoming && upcoming.scheduledAt
          ? {
              round: upcoming.round,
              trackName: upcoming.track.name,
              scheduledAt: upcoming.scheduledAt,
            }
          : null,
    };
  });
}

export type ScheduleRound = {
  raceId: string;
  round: number;
  trackName: string;
  trackType: string | null;
  scheduledAt: Date | null;
  status: RaceStatus;
};

export type LeagueMember = {
  membershipId: string;
  name: string;
  role: LeagueRole;
  isYou: boolean;
};

export type LeagueOverview = {
  league: {
    id: string;
    name: string;
    series: string;
    numberOfRaces: number;
    lapsPercent: number;
    status: string;
    joinCode: string;
  };
  role: LeagueRole;
  isAdmin: boolean;
  schedule: ScheduleRound[];
  members: LeagueMember[];
  standings: StandingEntry[];
};

/**
 * Everything the league overview page renders, or null if the user is not a
 * member. Bundles the schedule (NASCAR-042), member roster (NASCAR-021) and
 * the standings summary (NASCAR-070) in one round-trip-ish fetch.
 */
export async function getLeagueOverview(
  leagueId: string,
  userId: string,
): Promise<LeagueOverview | null> {
  const membership = await requireLeagueMembership(leagueId, userId);
  if (!membership) return null;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      series: true,
      numberOfRaces: true,
      lapsPercent: true,
      status: true,
      joinCode: true,
      races: {
        orderBy: { round: "asc" },
        select: {
          id: true,
          round: true,
          scheduledAt: true,
          status: true,
          track: { select: { name: true, trackType: true } },
        },
      },
      memberships: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          userId: true,
          role: true,
          user: { select: { displayName: true } },
        },
      },
    },
  });
  if (!league) return null;

  return {
    league: {
      id: league.id,
      name: league.name,
      series: league.series,
      numberOfRaces: league.numberOfRaces,
      lapsPercent: league.lapsPercent,
      status: league.status,
      joinCode: league.joinCode,
    },
    role: membership.role,
    isAdmin: membership.role === LeagueRole.ADMIN,
    schedule: league.races.map((race) => ({
      raceId: race.id,
      round: race.round,
      trackName: race.track.name,
      trackType: race.track.trackType,
      scheduledAt: race.scheduledAt,
      status: race.status,
    })),
    members: league.memberships.map((m) => ({
      membershipId: m.id,
      name:
        m.user.displayName?.trim() || (m.userId === userId ? "You" : "Member"),
      role: m.role,
      isYou: m.userId === userId,
    })),
    standings: await getStandings(leagueId),
  };
}

/** Championship standings from COMPLETED races (NASCAR-070). */
export async function getStandings(leagueId: string): Promise<StandingEntry[]> {
  const participants = await prisma.raceParticipant.findMany({
    where: {
      race: { leagueId, status: RaceStatus.COMPLETED },
      result: { isNot: null },
    },
    select: {
      isAi: true,
      aiName: true,
      membershipId: true,
      user: { select: { displayName: true } },
      membership: {
        select: { user: { select: { displayName: true } } },
      },
      result: { select: { finishPos: true, points: true } },
    },
  });

  return computeStandings(
    participants
      .filter((p) => p.result !== null)
      .map((p) => ({
        membershipId: p.membershipId,
        isAi: p.isAi,
        driverName: driverName({
          isAi: p.isAi,
          aiName: p.aiName,
          membershipDisplayName: p.membership?.user?.displayName,
          userDisplayName: p.user?.displayName,
        }),
        finishPos: p.result!.finishPos,
        points: p.result!.points,
      })),
  );
}

export type LeagueStandingsView = {
  leagueId: string;
  leagueName: string;
  standings: StandingEntry[];
};

/** Standings page data (NASCAR-070), membership-scoped. Null for non-members. */
export async function getLeagueStandings(
  leagueId: string,
  userId: string,
): Promise<LeagueStandingsView | null> {
  const membership = await requireLeagueMembership(leagueId, userId);
  if (!membership) return null;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true },
  });
  if (!league) return null;

  return {
    leagueId,
    leagueName: league.name,
    standings: await getStandings(leagueId),
  };
}

export type LeagueSettings = {
  id: string;
  name: string;
  series: string;
  numberOfRaces: number;
  lapsPercent: number;
  reminderLeadDays: number;
  status: string;
};

/** Editable league settings for the admin manage page (NASCAR-022). */
export async function getLeagueSettings(
  leagueId: string,
): Promise<LeagueSettings | null> {
  return prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      series: true,
      numberOfRaces: true,
      lapsPercent: true,
      reminderLeadDays: true,
      status: true,
    },
  });
}

export type RaceResultRow = {
  participantId: string;
  driverName: string;
  isAi: boolean;
  carNumber: number | null;
  startPos: number | null;
  finishPos: number | null;
  points: number;
  lapsLed: number;
  dnf: boolean;
};

export type RaceDetail = {
  leagueId: string;
  leagueName: string;
  round: number;
  trackName: string;
  trackType: string | null;
  scheduledAt: Date | null;
  status: RaceStatus;
  results: RaceResultRow[];
};

/**
 * Per-race results detail (NASCAR-070), membership-scoped. Includes AI drivers
 * (excluded from championship standings but shown here). Null for non-members
 * or unknown race.
 */
export async function getRaceDetail(
  leagueId: string,
  raceId: string,
  userId: string,
): Promise<RaceDetail | null> {
  const membership = await requireLeagueMembership(leagueId, userId);
  if (!membership) return null;

  const race = await prisma.race.findFirst({
    where: { id: raceId, leagueId },
    select: {
      round: true,
      scheduledAt: true,
      status: true,
      league: { select: { name: true } },
      track: { select: { name: true, trackType: true } },
      participants: {
        select: {
          id: true,
          isAi: true,
          aiName: true,
          carNumber: true,
          user: { select: { displayName: true } },
          membership: {
            select: { user: { select: { displayName: true } } },
          },
          result: {
            select: {
              startPos: true,
              finishPos: true,
              points: true,
              lapsLed: true,
              dnf: true,
            },
          },
        },
      },
    },
  });
  if (!race) return null;

  const results: RaceResultRow[] = race.participants
    .map((p) => ({
      participantId: p.id,
      driverName: driverName({
        isAi: p.isAi,
        aiName: p.aiName,
        membershipDisplayName: p.membership?.user?.displayName,
        userDisplayName: p.user?.displayName,
      }),
      isAi: p.isAi,
      carNumber: p.carNumber,
      startPos: p.result?.startPos ?? null,
      finishPos: p.result?.finishPos ?? null,
      points: p.result?.points ?? 0,
      lapsLed: p.result?.lapsLed ?? 0,
      dnf: p.result?.dnf ?? false,
    }))
    // Finished drivers first (by position), then anyone without a result.
    .sort((a, b) => {
      if (a.finishPos === null) return 1;
      if (b.finishPos === null) return -1;
      return a.finishPos - b.finishPos;
    });

  return {
    leagueId,
    leagueName: race.league.name,
    round: race.round,
    trackName: race.track.name,
    trackType: race.track.trackType,
    scheduledAt: race.scheduledAt,
    status: race.status,
    results,
  };
}
