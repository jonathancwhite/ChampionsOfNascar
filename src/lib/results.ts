// Race participants + results domain (NASCAR-060 / 061 / 062). Orchestrates the
// DB writes; the scoring math and finishing-order validation live in the pure
// points module (src/lib/points.ts). Authorization is the caller's job — the
// server actions re-check requireLeagueRole(ADMIN).

import { RaceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  computePoints,
  resolveScheme,
  validateFinishingOrder,
} from "@/lib/points";

export type ResultsResult = { ok: true } | { ok: false; error: string };

export type ParticipantInput = {
  /** membershipIds of current members who participated. */
  humans: string[];
  /** AI drivers; name required, car number optional. */
  aiEntries: { name: string; carNumber?: number | null }[];
};

/**
 * Replace a race's participant list (NASCAR-060). Editable only while the race
 * is not COMPLETED (after completion, edits go through results editing). Humans
 * must be current, non-removed members (respecting NASCAR-032); each appears at
 * most once. AI rows carry no userId, so they're naturally excluded from
 * championship/career aggregates.
 */
export async function setRaceParticipants(
  leagueId: string,
  raceId: string,
  input: ParticipantInput,
): Promise<ResultsResult> {
  return prisma.$transaction(async (tx) => {
    const race = await tx.race.findFirst({
      where: { id: raceId, leagueId },
      select: { status: true },
    });
    if (!race) return { ok: false, error: "Race not found in this league." };
    if (race.status === RaceStatus.COMPLETED) {
      return {
        ok: false,
        error: "This race is completed — edit its results instead.",
      };
    }

    const humanIds = [...new Set(input.humans)];
    const memberships = await tx.leagueMembership.findMany({
      where: { id: { in: humanIds }, leagueId, removedAt: null },
      select: { id: true, userId: true },
    });
    if (memberships.length !== humanIds.length) {
      return {
        ok: false,
        error: "Some selected players are no longer members of this league.",
      };
    }

    const ai = input.aiEntries
      .map((a) => ({
        name: a.name.trim(),
        carNumber: a.carNumber ?? null,
      }))
      .filter((a) => a.name.length > 0);

    // No results exist yet (race isn't completed), so a clean replace is safe.
    await tx.raceParticipant.deleteMany({ where: { raceId } });
    if (memberships.length > 0 || ai.length > 0) {
      await tx.raceParticipant.createMany({
        data: [
          ...memberships.map((m) => ({
            raceId,
            userId: m.userId,
            membershipId: m.id,
            isAi: false,
          })),
          ...ai.map((a) => ({
            raceId,
            isAi: true,
            aiName: a.name,
            carNumber: a.carNumber,
          })),
        ],
      });
    }
    return { ok: true };
  });
}

export type ResultEntry = {
  participantId: string;
  finishPos: number;
  startPos?: number | null;
  lapsLed?: number;
  dnf?: boolean;
  status?: string | null;
};

/**
 * Enter or edit a race's results (NASCAR-061 first entry, NASCAR-062 edits) and
 * mark the race COMPLETED. One RaceResult per participant; points are computed
 * from the league's current scheme and persisted (so standings stay a simple
 * SUM). Requires a result for every participant with a unique, contiguous 1..N
 * finishing order. `editorId` is recorded for the edit audit. Re-running with
 * the same inputs is idempotent. Wrapped in a transaction so a partial set can't
 * leave the race half-completed.
 */
export async function saveRaceResults(
  leagueId: string,
  raceId: string,
  editorId: string,
  entries: ResultEntry[],
): Promise<ResultsResult> {
  return prisma.$transaction(async (tx) => {
    const race = await tx.race.findFirst({
      where: { id: raceId, leagueId },
      select: {
        completedAt: true,
        league: { select: { pointsSystem: true } },
        participants: { select: { id: true } },
      },
    });
    if (!race) return { ok: false, error: "Race not found in this league." };
    if (race.participants.length === 0) {
      return { ok: false, error: "Add participants before entering results." };
    }

    const participantIds = new Set(race.participants.map((p) => p.id));
    if (
      entries.length !== participantIds.size ||
      !entries.every((e) => participantIds.has(e.participantId))
    ) {
      return { ok: false, error: "Enter a result for each participant." };
    }

    const order = validateFinishingOrder(entries.map((e) => e.finishPos));
    if (!order.ok) return order;

    const scheme = resolveScheme(race.league.pointsSystem);

    for (const e of entries) {
      const { points, bonusPoints } = computePoints(
        { finishPos: e.finishPos, lapsLed: e.lapsLed ?? 0 },
        scheme,
      );
      const data = {
        finishPos: e.finishPos,
        startPos: e.startPos ?? null,
        lapsLed: e.lapsLed ?? 0,
        dnf: e.dnf ?? false,
        status: e.status ?? null,
        points,
        bonusPoints,
        lastEditedById: editorId,
      };
      await tx.raceResult.upsert({
        where: { participantId: e.participantId },
        create: { participantId: e.participantId, ...data },
        update: data,
      });
    }

    await tx.race.update({
      where: { id: raceId },
      data: {
        status: RaceStatus.COMPLETED,
        // Preserve the original completion time across later edits.
        completedAt: race.completedAt ?? new Date(),
      },
    });
    return { ok: true };
  });
}

export type RecomputeResult =
  { ok: true; resultsUpdated: number } | { ok: false; error: string };

/**
 * Recompute persisted points for every COMPLETED race in a league using the
 * current scheme (NASCAR-062 / NASCAR-023 scheme change). Idempotent — re-running
 * yields the same values. Finishing order and laps led are unchanged; only the
 * derived points/bonusPoints are rewritten.
 */
export async function recomputeLeaguePoints(
  leagueId: string,
): Promise<RecomputeResult> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { pointsSystem: true },
  });
  if (!league) return { ok: false, error: "League not found." };

  const scheme = resolveScheme(league.pointsSystem);
  const results = await prisma.raceResult.findMany({
    where: {
      participant: { race: { leagueId, status: RaceStatus.COMPLETED } },
    },
    select: { id: true, finishPos: true, lapsLed: true },
  });

  await prisma.$transaction(
    results.map((r) => {
      const { points, bonusPoints } = computePoints(
        { finishPos: r.finishPos, lapsLed: r.lapsLed },
        scheme,
      );
      return prisma.raceResult.update({
        where: { id: r.id },
        data: { points, bonusPoints },
      });
    }),
  );

  return { ok: true, resultsUpdated: results.length };
}
