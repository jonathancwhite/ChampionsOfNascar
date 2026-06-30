// Championship standings computation (NASCAR-070). Pure and runtime-free of
// any `@/` value import, so it unit-tests under the bare node runner. The query
// layer (src/lib/league-queries.ts) fetches result rows for COMPLETED,
// non-CANCELLED races and feeds them here; this module aggregates and ranks.

/** One human-or-AI finish in a completed race. */
export type StandingInputRow = {
  /** Stable identity of the driver across races; null for AI drivers. */
  membershipId: string | null;
  isAi: boolean;
  driverName: string;
  finishPos: number;
  points: number;
};

export type StandingEntry = {
  rank: number;
  membershipId: string;
  driverName: string;
  points: number;
  starts: number;
  wins: number;
  top5: number;
  top10: number;
  /** Mean finishing position across starts; 0 when no starts. */
  avgFinish: number;
};

type Aggregate = {
  membershipId: string;
  driverName: string;
  points: number;
  starts: number;
  wins: number;
  top5: number;
  top10: number;
  finishSum: number;
  /** finishPos -> count, for the best-finishes tiebreaker. */
  finishes: Map<number, number>;
};

/**
 * Best-finishes tiebreaker: the driver with more wins (P1) ranks higher; if
 * equal, more 2nds, then more 3rds, and so on. Returns >0 when `b` should rank
 * ahead of `a` (i.e. sort descending by quality).
 */
function compareBestFinishes(a: Aggregate, b: Aggregate): number {
  let pos = 1;
  const maxPos = Math.max(...a.finishes.keys(), ...b.finishes.keys(), 1);
  for (; pos <= maxPos; pos++) {
    const countA = a.finishes.get(pos) ?? 0;
    const countB = b.finishes.get(pos) ?? 0;
    if (countA !== countB) {
      return countB - countA; // more good finishes first
    }
  }
  return 0;
}

/**
 * Rank human drivers by championship points. Tiebreakers, in order: total
 * points, then total wins, then best finishes (most 2nds, 3rds, …). AI drivers
 * (no membership) are excluded from the championship table entirely.
 */
export function computeStandings(rows: StandingInputRow[]): StandingEntry[] {
  const byDriver = new Map<string, Aggregate>();

  for (const row of rows) {
    // AI drivers never appear in the championship standings.
    if (row.isAi || row.membershipId === null) {
      continue;
    }

    let agg = byDriver.get(row.membershipId);
    if (!agg) {
      agg = {
        membershipId: row.membershipId,
        driverName: row.driverName,
        points: 0,
        starts: 0,
        wins: 0,
        top5: 0,
        top10: 0,
        finishSum: 0,
        finishes: new Map(),
      };
      byDriver.set(row.membershipId, agg);
    }

    agg.points += row.points;
    agg.starts += 1;
    agg.finishSum += row.finishPos;
    if (row.finishPos === 1) agg.wins += 1;
    if (row.finishPos <= 5) agg.top5 += 1;
    if (row.finishPos <= 10) agg.top10 += 1;
    agg.finishes.set(row.finishPos, (agg.finishes.get(row.finishPos) ?? 0) + 1);
  }

  const ordered = [...byDriver.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return compareBestFinishes(a, b);
  });

  return ordered.map((agg, index) => {
    // Equal rank when two drivers tie on every criterion above.
    const prev = ordered[index - 1];
    const tiedWithPrev =
      prev !== undefined &&
      prev.points === agg.points &&
      prev.wins === agg.wins &&
      compareBestFinishes(prev, agg) === 0;

    return {
      rank: tiedWithPrev ? rankOf(ordered, index) : index + 1,
      membershipId: agg.membershipId,
      driverName: agg.driverName,
      points: agg.points,
      starts: agg.starts,
      wins: agg.wins,
      top5: agg.top5,
      top10: agg.top10,
      avgFinish: agg.starts > 0 ? agg.finishSum / agg.starts : 0,
    };
  });
}

/** Rank of the entry at `index`, shared with any preceding tied entries. */
function rankOf(ordered: Aggregate[], index: number): number {
  let i = index;
  while (
    i > 0 &&
    ordered[i - 1].points === ordered[index].points &&
    ordered[i - 1].wins === ordered[index].wins &&
    compareBestFinishes(ordered[i - 1], ordered[index]) === 0
  ) {
    i--;
  }
  return i + 1;
}
