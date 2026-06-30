// League creation domain (NASCAR-020). Validation, join-code generation, and
// the single transaction that creates a league with its creator-as-admin
// membership and a randomized schedule (NASCAR-040).

import { customAlphabet } from "nanoid";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { LeagueRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { classifyJoin, normalizeJoinCode } from "@/lib/join";
import { LEAGUE_STATUSES, isValidStatusTransition } from "@/lib/league-status";
import { pointsSchemeSchema } from "@/lib/points";
import { generateSchedule } from "@/lib/schedule";
import { LEAGUE_TIMEZONES } from "@/lib/timezone";
import { SERIES_VALUES, type SeriesValue } from "@/lib/series";

// Unambiguous uppercase alphabet (no 0/O/1/I/L) — join codes are typed by hand
// by friends joining a league. Entropy/hardening is revisited in NASCAR-082.
const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const JOIN_CODE_LENGTH = 8;
const newJoinCode = customAlphabet(JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH);

const MAX_JOIN_CODE_ATTEMPTS = 5;

export const createLeagueInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "League name is required.")
    .max(80, "Name is too long."),
  series: z.enum(SERIES_VALUES),
  numberOfRaces: z.coerce
    .number()
    .int("Enter a whole number.")
    .min(1, "At least 1 race."),
  lapsPercent: z.coerce
    .number()
    .int("Enter a whole number.")
    .min(1, "Minimum 1%.")
    .max(100, "Maximum 100%."),
  reminderLeadDays: z.coerce
    .number()
    .int("Enter a whole number.")
    .min(0, "Cannot be negative.")
    .max(30, "Maximum 30 days.")
    .default(5),
});

export type CreateLeagueInput = z.input<typeof createLeagueInputSchema>;

export type CreateLeagueResult =
  | { ok: true; leagueId: string; joinCode: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

/**
 * Active-track count per series. Drives the cap-at-pool rule both in the form
 * (max on `numberOfRaces`) and server-side here.
 */
export async function trackCountsBySeries(): Promise<
  Record<SeriesValue, number>
> {
  const counts: Record<SeriesValue, number> = {
    ARCA: 0,
    TRUCK: 0,
    XFINITY: 0,
    CUP: 0,
  };
  const rows = await prisma.track.findMany({
    where: { active: true },
    select: { series: true },
  });
  for (const row of rows) {
    for (const series of row.series) {
      counts[series as SeriesValue] += 1;
    }
  }
  return counts;
}

function firstFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) {
      out[key] = issue.message;
    }
  }
  return out;
}

function isJoinCodeCollision(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    // target is the unique field(s) that collided
    ([] as string[])
      .concat((error.meta?.target as string[] | string | undefined) ?? [])
      .includes("joinCode")
  );
}

/**
 * Create a league for `creatorId`. In one transaction: the `League` (status
 * "setup"), the creator's ADMIN `LeagueMembership`, and a randomized schedule.
 * Validates input and enforces the cap-at-pool rule server-side. Retries on the
 * (vanishingly rare) join-code collision.
 */
export async function createLeague(
  creatorId: string,
  input: Record<string, unknown>,
): Promise<CreateLeagueResult> {
  const parsed = createLeagueInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: firstFieldErrors(parsed.error) };
  }
  const { name, series, numberOfRaces, lapsPercent, reminderLeadDays } =
    parsed.data;

  // Cap-at-pool: cannot schedule more races than there are tracks for the series.
  const pool = await prisma.track.count({
    where: { active: true, series: { has: series } },
  });
  if (pool === 0) {
    return { ok: false, error: `No tracks are available for ${series} yet.` };
  }
  if (numberOfRaces > pool) {
    return {
      ok: false,
      fieldErrors: {
        numberOfRaces: `Maximum ${pool} races for ${series} (track pool size).`,
      },
    };
  }

  for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
    const joinCode = newJoinCode();
    try {
      const league = await prisma.$transaction(async (tx) => {
        const created = await tx.league.create({
          data: {
            name,
            series,
            numberOfRaces,
            lapsPercent,
            reminderLeadDays,
            joinCode,
            status: "setup",
            creatorId,
            memberships: {
              create: { userId: creatorId, role: LeagueRole.ADMIN },
            },
          },
          select: { id: true },
        });
        await generateSchedule(tx, {
          leagueId: created.id,
          series,
          numberOfRaces,
        });
        return created;
      });
      return { ok: true, leagueId: league.id, joinCode };
    } catch (error) {
      if (isJoinCodeCollision(error)) {
        continue; // regenerate the code and retry the whole transaction
      }
      throw error;
    }
  }

  return {
    ok: false,
    error: "Could not generate a unique join code. Please try again.",
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export type JoinLeagueResult =
  | { ok: true; leagueId: string; alreadyMember: boolean }
  | { ok: false; error: string };

/**
 * Join a league by its code (NASCAR-030). Normalizes the code, looks up the
 * league, and creates a MEMBER membership for `userId`. Idempotent: an existing
 * (or concurrently-created) membership resolves to `alreadyMember: true` rather
 * than erroring, backed by the `@@unique([leagueId, userId])` constraint.
 */
export async function joinLeague(
  userId: string,
  rawCode: string,
): Promise<JoinLeagueResult> {
  const code = normalizeJoinCode(rawCode);
  if (code.length === 0) {
    return { ok: false, error: "Enter a join code." };
  }

  const league = await prisma.league.findUnique({
    where: { joinCode: code },
    select: { id: true, status: true },
  });

  // A soft-removed membership (NASCAR-032) still exists, so re-joining must
  // reactivate that row rather than create a duplicate (the unique constraint
  // would reject it). Only a present, non-removed row counts as "already member".
  const existing = league
    ? await prisma.leagueMembership.findUnique({
        where: { leagueId_userId: { leagueId: league.id, userId } },
        select: { id: true, removedAt: true },
      })
    : null;

  const decision = classifyJoin({
    leagueExists: league !== null,
    status: league?.status,
    alreadyMember: existing !== null && existing.removedAt === null,
  });

  switch (decision.kind) {
    case "error":
      return { ok: false, error: decision.error };
    case "already":
      return { ok: true, leagueId: league!.id, alreadyMember: true };
    case "join":
      break;
  }

  // Rejoining: clear the soft-delete and reset to MEMBER.
  if (existing) {
    await prisma.leagueMembership.update({
      where: { id: existing.id },
      data: { removedAt: null, role: LeagueRole.MEMBER },
    });
    return { ok: true, leagueId: league!.id, alreadyMember: false };
  }

  try {
    await prisma.leagueMembership.create({
      data: { leagueId: league!.id, userId, role: LeagueRole.MEMBER },
    });
  } catch (error) {
    // Concurrent join created the membership first — treat as already joined.
    if (isUniqueViolation(error)) {
      return { ok: true, leagueId: league!.id, alreadyMember: true };
    }
    throw error;
  }

  return { ok: true, leagueId: league!.id, alreadyMember: false };
}

export const updateLeagueSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "League name is required.")
    .max(80, "Name is too long."),
  lapsPercent: z.coerce
    .number()
    .int("Enter a whole number.")
    .min(1, "Minimum 1%.")
    .max(100, "Maximum 100%."),
  reminderLeadDays: z.coerce
    .number()
    .int("Enter a whole number.")
    .min(0, "Cannot be negative.")
    .max(30, "Maximum 30 days."),
  timezone: z.enum(LEAGUE_TIMEZONES),
  status: z.enum(LEAGUE_STATUSES),
});

export type UpdateLeagueSettingsResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

/**
 * Update an admin-editable league's settings (NASCAR-022): name, lap %,
 * reminder lead days, and lifecycle status. Series and number of races are NOT
 * editable here — the schedule is already generated against them; reshuffling
 * is the separate regenerate flow (NASCAR-041). Validation mirrors createLeague;
 * the status change must be a valid lifecycle transition. Authorization is the
 * caller's responsibility (`requireLeagueRole`).
 */
export async function updateLeagueSettings(
  leagueId: string,
  input: Record<string, unknown>,
): Promise<UpdateLeagueSettingsResult> {
  const parsed = updateLeagueSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: firstFieldErrors(parsed.error) };
  }
  const { name, lapsPercent, reminderLeadDays, timezone, status } = parsed.data;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { status: true },
  });
  if (!league) {
    return { ok: false, error: "League not found." };
  }

  if (!isValidStatusTransition(league.status, status)) {
    return {
      ok: false,
      fieldErrors: {
        status: `Cannot change status from ${league.status} to ${status}.`,
      },
    };
  }

  await prisma.league.update({
    where: { id: leagueId },
    data: { name, lapsPercent, reminderLeadDays, timezone, status },
  });

  return { ok: true };
}

/** Parse a free-text points table ("40, 35, 34 …") into a number array. */
export function parsePointsTable(raw: string): number[] {
  return raw
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map(Number);
}

export type UpdatePointsResult = { ok: true } | { ok: false; error: string };

/**
 * Persist a league's custom points scheme (NASCAR-023). Builds a versioned
 * scheme from the editor inputs and validates it (rejecting negatives / NaN /
 * empty table) before storing it as JSON on `League.pointsSystem`. Authorization
 * is the caller's responsibility; a league-wide recompute is offered separately.
 */
export async function updatePointsScheme(
  leagueId: string,
  input: { table: number[]; win: number; lapsLed: number },
): Promise<UpdatePointsResult> {
  const parsed = pointsSchemeSchema.safeParse({
    version: 1,
    table: input.table,
    bonuses: { win: input.win, lapsLed: input.lapsLed },
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "Points must be whole numbers ≥ 0, with at least one position in the table.",
    };
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });
  if (!league) return { ok: false, error: "League not found." };

  await prisma.league.update({
    where: { id: leagueId },
    data: { pointsSystem: parsed.data },
  });
  return { ok: true };
}
