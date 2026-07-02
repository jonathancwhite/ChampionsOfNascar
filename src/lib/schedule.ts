// Schedule randomizer (NASCAR-040). Generates a non-repeating, randomized
// season schedule from the track pool for a league's series.
//
// This module is deliberately free of runtime `@/` imports: the Prisma types
// below are `import type` (erased at compile time) and the DB clients are
// injected by callers. That keeps the pure helpers unit-testable under a bare
// runner (node --test) without alias resolution or a database.

import type { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import type { SeriesType } from "@/generated/prisma/enums";

import { validateRaceMove } from "./schedule-reorder";

/** Thrown for caller-recoverable schedule problems (empty pool, locked, etc). */
export class ScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScheduleError";
  }
}

/**
 * Mulberry32 — a tiny, fast, seedable PRNG. Returns a function producing
 * floats in [0, 1). Used to make the shuffle deterministic in tests; the app
 * passes the default `Math.random`.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher–Yates shuffle. Pure: returns a new array, never mutates the input.
 * `rng` must return a float in [0, 1).
 */
export function shuffle<T>(
  items: readonly T[],
  rng: () => number = Math.random,
): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Shuffle `tracks` and take the first `count` with no repeats. The caller
 * (createLeague) already enforces the cap-at-pool rule; this guards defensively
 * so an out-of-range count fails loudly instead of silently truncating.
 */
export function pickTracks<T>(
  tracks: readonly T[],
  count: number,
  rng: () => number = Math.random,
): T[] {
  if (count < 1) {
    throw new ScheduleError("A schedule needs at least one race.");
  }
  if (count > tracks.length) {
    throw new ScheduleError(
      `Not enough tracks: need ${count}, pool has ${tracks.length}.`,
    );
  }
  return shuffle(tracks, rng).slice(0, count);
}

export type GenerateScheduleArgs = {
  leagueId: string;
  series: SeriesType;
  numberOfRaces: number;
};

/**
 * Persist a fresh schedule inside an existing transaction. Loads the active
 * tracks for the league's series, picks `numberOfRaces` at random with no
 * repeats, and writes `Race` rows numbered `round = 1..N` (status SCHEDULED,
 * `scheduledAt` left null for an admin to set later — NASCAR-050).
 *
 * Takes the transaction client so it composes into `createLeague`'s single
 * transaction (NASCAR-020) and `regenerateSchedule` below.
 */
export async function generateSchedule(
  tx: Prisma.TransactionClient,
  { leagueId, series, numberOfRaces }: GenerateScheduleArgs,
  rng: () => number = Math.random,
): Promise<number> {
  const tracks = await tx.track.findMany({
    where: { active: true, series: { has: series } },
    select: { id: true },
  });

  const picked = pickTracks(tracks, numberOfRaces, rng);

  const { count } = await tx.race.createMany({
    data: picked.map((track, index) => ({
      leagueId,
      trackId: track.id,
      round: index + 1,
    })),
  });

  return count;
}

/**
 * Admin-only re-roll of a league's schedule while it is still in `setup`.
 * Blocked once any race has been dated or has results, so a season in progress
 * can't be silently reshuffled. The DB client is injected (no module-level
 * Prisma import) — the admin entry point is wired with NASCAR-041.
 */
export async function regenerateSchedule(
  db: PrismaClient,
  leagueId: string,
  rng: () => number = Math.random,
): Promise<number> {
  return db.$transaction(async (tx) => {
    const league = await tx.league.findUnique({
      where: { id: leagueId },
      select: { id: true, series: true, numberOfRaces: true, status: true },
    });
    if (!league) {
      throw new ScheduleError("League not found.");
    }
    if (league.status !== "setup") {
      throw new ScheduleError(
        "Schedule can only be regenerated while the league is in setup.",
      );
    }

    // Locked if any race is dated, no longer SCHEDULED, or already has a result.
    const locked = await tx.race.findFirst({
      where: {
        leagueId,
        OR: [
          { scheduledAt: { not: null } },
          { status: { not: "SCHEDULED" } },
          { participants: { some: { result: { isNot: null } } } },
        ],
      },
      select: { id: true },
    });
    if (locked) {
      throw new ScheduleError(
        "Schedule is locked: a race already has a date or results.",
      );
    }

    await tx.race.deleteMany({ where: { leagueId } });
    return generateSchedule(
      tx,
      {
        leagueId,
        series: league.series,
        numberOfRaces: league.numberOfRaces,
      },
      rng,
    );
  });
}

export type SwapResult = { ok: true } | { ok: false; error: string };

/**
 * Pure rule check for a track swap (NASCAR-041). Kept separate from the DB work
 * so the series / no-repeat / completed-race guards unit-test without a database.
 * The caller resolves each boolean from queries and feeds them here.
 */
export function validateTrackSwap(args: {
  raceFound: boolean;
  raceCompleted: boolean;
  newTrackInSeries: boolean;
  newTrackAlreadyUsed: boolean;
}): SwapResult {
  if (!args.raceFound) {
    return { ok: false, error: "Race not found in this league." };
  }
  if (args.raceCompleted) {
    return {
      ok: false,
      error: "This race is completed — its track can't be changed.",
    };
  }
  if (!args.newTrackInSeries) {
    return { ok: false, error: "That track isn't in this league's series." };
  }
  if (args.newTrackAlreadyUsed) {
    return { ok: false, error: "That track is already used in this league." };
  }
  return { ok: true };
}

export type SwapTrackArgs = {
  leagueId: string;
  raceId: string;
  newTrackId: string;
};

/**
 * Swap a scheduled race's track (NASCAR-041). Updates only `trackId`; `round`
 * and `scheduledAt` are preserved. Enforced: the race exists in the league and
 * is not COMPLETED, and the replacement is an active track in the league's
 * series that isn't already used by another round (no-repeat). The DB client is
 * injected so this module stays runtime-pure. Authorization is the caller's job.
 */
export async function swapTrack(
  db: PrismaClient,
  { leagueId, raceId, newTrackId }: SwapTrackArgs,
): Promise<SwapResult> {
  return db.$transaction(async (tx) => {
    const race = await tx.race.findFirst({
      where: { id: raceId, leagueId },
      select: {
        trackId: true,
        status: true,
        league: { select: { series: true } },
      },
    });
    const newTrack = await tx.track.findUnique({
      where: { id: newTrackId },
      select: { series: true, active: true },
    });
    const collision = await tx.race.findFirst({
      where: { leagueId, trackId: newTrackId, NOT: { id: raceId } },
      select: { id: true },
    });

    const decision = validateTrackSwap({
      raceFound: race !== null,
      raceCompleted: race?.status === "COMPLETED",
      newTrackInSeries:
        race !== null &&
        newTrack !== null &&
        newTrack.active &&
        newTrack.series.includes(race.league.series),
      newTrackAlreadyUsed: collision !== null,
    });
    if (!decision.ok) return decision;

    // Same track selected: nothing to do (idempotent).
    if (race!.trackId !== newTrackId) {
      await tx.race.update({
        where: { id: raceId },
        data: { trackId: newTrackId },
      });
    }
    return { ok: true };
  });
}

export type RaceRoundSummary = {
  round: number;
  status: string;
};

export type AdjustRaceCountResult =
  { ok: true; noop?: boolean } | { ok: false; error: string };

/**
 * Pure validation for changing a league's race count (NASCAR-088). Decrease is
 * blocked when a completed tail race would be removed; increase requires enough
 * unused tracks in the series pool.
 */
export function validateRaceCountAdjust(args: {
  currentCount: number;
  newCount: number;
  maxPool: number;
  leagueStatus: string;
  races: readonly RaceRoundSummary[];
}): AdjustRaceCountResult {
  if (args.leagueStatus === "finished") {
    return {
      ok: false,
      error: "Cannot change the race count for a finished league.",
    };
  }

  if (!Number.isInteger(args.newCount) || args.newCount < 1) {
    return { ok: false, error: "At least 1 race is required." };
  }

  if (args.newCount > args.maxPool) {
    return {
      ok: false,
      error: `Maximum ${args.maxPool} races for this series (track pool size).`,
    };
  }

  if (args.newCount === args.currentCount) {
    return { ok: true, noop: true };
  }

  if (args.newCount < args.currentCount) {
    const blocking = args.races.find(
      (r) => r.round > args.newCount && r.status === "COMPLETED",
    );
    if (blocking) {
      return {
        ok: false,
        error: `Cannot shorten the schedule — round ${blocking.round} is already completed.`,
      };
    }
    return { ok: true };
  }

  const toAdd = args.newCount - args.currentCount;
  const unusedTracks = args.maxPool - args.races.length;
  if (toAdd > unusedTracks) {
    return {
      ok: false,
      error: `Not enough unused tracks to add ${toAdd} more race${toAdd === 1 ? "" : "s"}.`,
    };
  }

  return { ok: true };
}

/**
 * Increase or decrease a league's schedule length from the tail (NASCAR-088).
 * Appends randomized unused tracks on increase; removes highest rounds on
 * decrease (never completed races). Updates `League.numberOfRaces`. Does not
 * reorder existing rounds. Authorization is the caller's job.
 */
export async function adjustRaceCount(
  db: PrismaClient,
  leagueId: string,
  newCount: number,
  rng: () => number = Math.random,
): Promise<AdjustRaceCountResult> {
  return db.$transaction(async (tx) => {
    const league = await tx.league.findUnique({
      where: { id: leagueId },
      select: { series: true, numberOfRaces: true, status: true },
    });
    if (!league) {
      return { ok: false, error: "League not found." };
    }

    const races = await tx.race.findMany({
      where: { leagueId },
      select: { round: true, status: true, trackId: true },
      orderBy: { round: "asc" },
    });

    const maxPool = await tx.track.count({
      where: { active: true, series: { has: league.series } },
    });

    const validation = validateRaceCountAdjust({
      currentCount: league.numberOfRaces,
      newCount,
      maxPool,
      leagueStatus: league.status,
      races,
    });
    if (!validation.ok) return validation;
    if (validation.noop) return { ok: true };

    if (newCount < league.numberOfRaces) {
      await tx.race.deleteMany({
        where: { leagueId, round: { gt: newCount } },
      });
    } else {
      const usedTrackIds = new Set(races.map((r) => r.trackId));
      const available = await tx.track.findMany({
        where: {
          active: true,
          series: { has: league.series },
          id: { notIn: [...usedTrackIds] },
        },
        select: { id: true },
      });

      const toAdd = newCount - league.numberOfRaces;
      const picked = pickTracks(available, toAdd, rng);
      const startRound = league.numberOfRaces + 1;

      await tx.race.createMany({
        data: picked.map((track, index) => ({
          leagueId,
          trackId: track.id,
          round: startRound + index,
        })),
      });
    }

    await tx.league.update({
      where: { id: leagueId },
      data: { numberOfRaces: newCount },
    });

    return { ok: true };
  });
}

/**
 * Swap a race with its neighbor one round up or down (NASCAR-089). Preserves
 * track, date, status, and results — only `round` changes. No email is sent.
 * Authorization is the caller's job.
 */
export async function moveRace(
  db: PrismaClient,
  leagueId: string,
  raceId: string,
  direction: "up" | "down",
): Promise<{ ok: true } | { ok: false; error: string }> {
  return db.$transaction(async (tx) => {
    const races = await tx.race.findMany({
      where: { leagueId },
      select: { id: true, round: true, status: true },
      orderBy: { round: "asc" },
    });

    const validation = validateRaceMove({ races, raceId, direction });
    if (!validation.ok) return validation;

    const race = races.find((r) => r.id === raceId)!;
    const neighbor = races.find((r) => r.id === validation.swapWithRaceId)!;

    // Two-phase round swap avoids @@unique([leagueId, round]) collisions.
    await tx.race.update({
      where: { id: race.id },
      data: { round: -race.round },
    });
    await tx.race.update({
      where: { id: neighbor.id },
      data: { round: race.round },
    });
    await tx.race.update({
      where: { id: race.id },
      data: { round: neighbor.round },
    });

    return { ok: true };
  });
}
