// League creation domain (NASCAR-020). Validation, join-code generation, and
// the single transaction that creates a league with its creator-as-admin
// membership and a randomized schedule (NASCAR-040).

import { customAlphabet } from "nanoid";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { LeagueRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { generateSchedule } from "@/lib/schedule";
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
