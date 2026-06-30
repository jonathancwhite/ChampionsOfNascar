// League read-side queries (NASCAR-021 dashboard/overview, NASCAR-042 schedule,
// NASCAR-070 standings). All are membership-scoped: a query returns null/empty
// for a user who doesn't belong to the league, so callers can 404 non-members.

import { LeagueRole, RaceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { resolveScheme } from "@/lib/points";
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
  // findFirst (not findUnique) so we can filter out soft-removed memberships
  // (NASCAR-032): a removed member resolves to null and is denied like a non-member.
  return prisma.leagueMembership.findFirst({
    where: { leagueId, userId, removedAt: null },
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
    where: { userId, removedAt: null },
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
  /** League owner (creator). Cannot be removed; must transfer before leaving. */
  isCreator: boolean;
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
      creatorId: true,
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
        where: { removedAt: null },
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
      isCreator: m.userId === league.creatorId,
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

export type NotifiableMember = {
  membershipId: string;
  userId: string;
  email: string;
};

/**
 * Members of a league who have NOT opted out of email (NASCAR-053). The single
 * source of eligible recipients — notification senders (NASCAR-051/052) call
 * this so suppressed members are skipped uniformly.
 */
export async function getNotifiableMembers(
  leagueId: string,
): Promise<NotifiableMember[]> {
  const memberships = await prisma.leagueMembership.findMany({
    where: { leagueId, notifyByEmail: true, removedAt: null },
    select: {
      id: true,
      userId: true,
      user: { select: { email: true } },
    },
  });

  return memberships
    .filter((m) => !m.user.email.endsWith("@no-email.invalid"))
    .map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      email: m.user.email,
    }));
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

export type TrackOption = {
  id: string;
  name: string;
  trackType: string | null;
};

export type ManageScheduleRound = {
  raceId: string;
  round: number;
  trackId: string;
  trackName: string;
  trackType: string | null;
  scheduledAt: Date | null;
  status: RaceStatus;
  /** False once the race is COMPLETED — its track is locked (NASCAR-041). */
  canSwap: boolean;
};

export type ManageSchedule = {
  leagueId: string;
  leagueName: string;
  rounds: ManageScheduleRound[];
  /** Active series tracks not already used by a round — valid swap targets. */
  availableTracks: TrackOption[];
};

/**
 * Admin schedule-management view (NASCAR-041): every round plus the set of
 * tracks available to swap in — the series pool minus tracks already used in
 * this league (the no-repeat rule). Authorization is the page's responsibility
 * (`requireLeagueRole` ADMIN). Null for an unknown league.
 */
export async function getManageSchedule(
  leagueId: string,
): Promise<ManageSchedule | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      name: true,
      series: true,
      races: {
        orderBy: { round: "asc" },
        select: {
          id: true,
          round: true,
          trackId: true,
          scheduledAt: true,
          status: true,
          track: { select: { name: true, trackType: true } },
        },
      },
    },
  });
  if (!league) return null;

  const usedTrackIds = new Set(league.races.map((r) => r.trackId));
  const pool = await prisma.track.findMany({
    where: { active: true, series: { has: league.series } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, trackType: true },
  });

  return {
    leagueId,
    leagueName: league.name,
    rounds: league.races.map((r) => ({
      raceId: r.id,
      round: r.round,
      trackId: r.trackId,
      trackName: r.track.name,
      trackType: r.track.trackType,
      scheduledAt: r.scheduledAt,
      status: r.status,
      canSwap: r.status !== RaceStatus.COMPLETED,
    })),
    availableTracks: pool.filter((t) => !usedTrackIds.has(t.id)),
  };
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
  isAdmin: boolean;
  /** Whether a participant field has been set (drives the admin CTAs). */
  hasParticipants: boolean;
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
    isAdmin: membership.role === LeagueRole.ADMIN,
    hasParticipants: race.participants.length > 0,
    results,
  };
}

export type PointsSettings = {
  table: number[];
  bonuses: { win: number; lapsLed: number };
  /** Completed races whose points a scheme change would recompute (NASCAR-023). */
  completedRaceCount: number;
};

/** Current points scheme + recompute scope for the admin editor (NASCAR-023). */
export async function getPointsSettings(
  leagueId: string,
): Promise<PointsSettings | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { pointsSystem: true },
  });
  if (!league) return null;

  const scheme = resolveScheme(league.pointsSystem);
  const completedRaceCount = await prisma.race.count({
    where: { leagueId, status: RaceStatus.COMPLETED },
  });
  return {
    table: scheme.table,
    bonuses: scheme.bonuses,
    completedRaceCount,
  };
}

export type ParticipantsEditorMember = {
  membershipId: string;
  name: string;
  selected: boolean;
};

export type ParticipantsEditor = {
  leagueId: string;
  raceId: string;
  round: number;
  trackName: string;
  status: RaceStatus;
  members: ParticipantsEditorMember[];
  aiEntries: { name: string; carNumber: number | null }[];
};

/**
 * Data for the participant editor (NASCAR-060): current (non-removed) members
 * with a flag for who's already in the race, plus existing AI entries. Only
 * current members appear, so the picker respects roster changes (NASCAR-032).
 * Null for an unknown race.
 */
export async function getRaceParticipantsEditor(
  leagueId: string,
  raceId: string,
): Promise<ParticipantsEditor | null> {
  const race = await prisma.race.findFirst({
    where: { id: raceId, leagueId },
    select: {
      round: true,
      status: true,
      track: { select: { name: true } },
      participants: {
        select: {
          membershipId: true,
          isAi: true,
          aiName: true,
          carNumber: true,
        },
      },
    },
  });
  if (!race) return null;

  const members = await prisma.leagueMembership.findMany({
    where: { leagueId, removedAt: null },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, user: { select: { displayName: true } } },
  });
  const selected = new Set(
    race.participants
      .filter((p) => !p.isAi && p.membershipId)
      .map((p) => p.membershipId as string),
  );

  return {
    leagueId,
    raceId,
    round: race.round,
    trackName: race.track.name,
    status: race.status,
    members: members.map((m) => ({
      membershipId: m.id,
      name: m.user.displayName?.trim() || "Member",
      selected: selected.has(m.id),
    })),
    aiEntries: race.participants
      .filter((p) => p.isAi)
      .map((p) => ({ name: p.aiName ?? "", carNumber: p.carNumber })),
  };
}

export type ResultEditorRow = {
  participantId: string;
  driverName: string;
  isAi: boolean;
  carNumber: number | null;
  finishPos: number | null;
  startPos: number | null;
  lapsLed: number;
  dnf: boolean;
  status: string | null;
};

export type ResultsEditor = {
  leagueId: string;
  raceId: string;
  round: number;
  trackName: string;
  status: RaceStatus;
  rows: ResultEditorRow[];
};

/**
 * Per-participant rows for the results form (NASCAR-061 entry / NASCAR-062
 * edit), prefilled with any existing result. Ordered by finishing position
 * (unscored rows last). Null for an unknown race.
 */
export async function getRaceResultsEditor(
  leagueId: string,
  raceId: string,
): Promise<ResultsEditor | null> {
  const race = await prisma.race.findFirst({
    where: { id: raceId, leagueId },
    select: {
      round: true,
      status: true,
      track: { select: { name: true } },
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
              finishPos: true,
              startPos: true,
              lapsLed: true,
              dnf: true,
              status: true,
            },
          },
        },
      },
    },
  });
  if (!race) return null;

  const rows: ResultEditorRow[] = race.participants
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
      finishPos: p.result?.finishPos ?? null,
      startPos: p.result?.startPos ?? null,
      lapsLed: p.result?.lapsLed ?? 0,
      dnf: p.result?.dnf ?? false,
      status: p.result?.status ?? null,
    }))
    .sort((a, b) => {
      if (a.finishPos === null && b.finishPos === null) return 0;
      if (a.finishPos === null) return 1;
      if (b.finishPos === null) return -1;
      return a.finishPos - b.finishPos;
    });

  return {
    leagueId,
    raceId,
    round: race.round,
    trackName: race.track.name,
    status: race.status,
    rows,
  };
}
