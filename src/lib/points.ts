// Points scoring (NASCAR-023). The single source of truth for how a finish
// becomes championship points. Pure — imports only zod — so it unit-tests under
// the bare node runner with no database; the result-entry domain (results.ts)
// and the standings query feed it persisted values.
//
// A scheme is stored as JSON on `League.pointsSystem` (null = the default
// 40-down scheme). Keep it small and versioned so future shapes parse safely.

import { z } from "zod";

/** Beyond the explicit table, every finishing position is worth this. */
export const POINTS_FLOOR = 1;

export const pointsSchemeSchema = z.object({
  version: z.literal(1),
  // Points by finishing position: table[0] = P1, table[1] = P2, … Positions
  // past the table earn POINTS_FLOOR (the "floor 1" rule).
  table: z.array(z.number().finite().int().min(0)).min(1).max(60),
  bonuses: z.object({
    // Added when a driver finishes 1st.
    win: z.number().finite().int().min(0),
    // Added when a driver led at least one lap.
    lapsLed: z.number().finite().int().min(0),
  }),
});

export type PointsScheme = z.infer<typeof pointsSchemeSchema>;

/** The default 40-down table: 1st=40, 2nd=35, 3rd=34, then −1/position, floor 1. */
function defaultTable(): number[] {
  const table = [40, 35];
  for (let pos = 3; pos <= 40; pos++) {
    table.push(Math.max(POINTS_FLOOR, 37 - pos));
  }
  return table;
}

export const DEFAULT_SCHEME: PointsScheme = {
  version: 1,
  table: defaultTable(),
  bonuses: { win: 0, lapsLed: 0 },
};

/**
 * Resolve the effective scheme from a stored `League.pointsSystem` value. Null
 * (or an unparseable value, defensively) yields the default scheme.
 */
export function resolveScheme(stored: unknown): PointsScheme {
  if (stored == null) return DEFAULT_SCHEME;
  const parsed = pointsSchemeSchema.safeParse(stored);
  return parsed.success ? parsed.data : DEFAULT_SCHEME;
}

/** Base points for a finishing position under a scheme (floor beyond the table). */
export function basePointsFor(scheme: PointsScheme, finishPos: number): number {
  if (!Number.isInteger(finishPos) || finishPos < 1) return 0;
  return finishPos <= scheme.table.length
    ? scheme.table[finishPos - 1]
    : POINTS_FLOOR;
}

export type ComputedPoints = {
  basePoints: number;
  bonusPoints: number;
  points: number;
};

/**
 * Points for one finish under a scheme: position base plus bonuses (win,
 * led-a-lap). `points` is the total that lands on `RaceResult.points` and gets
 * SUMmed into standings; `bonusPoints` is the bonus portion, stored alongside.
 */
export function computePoints(
  input: { finishPos: number; lapsLed?: number },
  scheme: PointsScheme,
): ComputedPoints {
  const basePoints = basePointsFor(scheme, input.finishPos);
  let bonusPoints = 0;
  if (input.finishPos === 1) bonusPoints += scheme.bonuses.win;
  if ((input.lapsLed ?? 0) > 0) bonusPoints += scheme.bonuses.lapsLed;
  return { basePoints, bonusPoints, points: basePoints + bonusPoints };
}

export type OrderCheck = { ok: true } | { ok: false; error: string };

/**
 * Validate a set of finishing positions: each must be an integer in 1..N and
 * unique (N = number of participants). Unique + in-range + count N ⇒ a
 * contiguous 1..N permutation, so "no gaps" and "no missing participant" are
 * both covered (NASCAR-061).
 */
export function validateFinishingOrder(positions: number[]): OrderCheck {
  const n = positions.length;
  if (n === 0)
    return { ok: false, error: "There are no participants to score." };

  const seen = new Set<number>();
  for (const pos of positions) {
    if (!Number.isInteger(pos) || pos < 1 || pos > n) {
      return {
        ok: false,
        error: `Finishing positions must be between 1 and ${n}.`,
      };
    }
    if (seen.has(pos)) {
      return {
        ok: false,
        error: "Each finishing position can be used only once.",
      };
    }
    seen.add(pos);
  }
  return { ok: true };
}
