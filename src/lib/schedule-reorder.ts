// Pure schedule reorder helpers (NASCAR-089). No database imports — safe for
// client components that need move-up/down affordances without pulling in Prisma.

export type ReorderRaceSummary = {
  id: string;
  round: number;
  status: string;
};

export type MoveRaceResult =
  { ok: true; swapWithRaceId: string } | { ok: false; error: string };

/**
 * Guard for moving a race one slot up/down. Completed races are pinned — they
 * cannot move, and non-completed races cannot swap past them.
 */
export function validateRaceMove(args: {
  races: readonly ReorderRaceSummary[];
  raceId: string;
  direction: "up" | "down";
}): MoveRaceResult {
  const sorted = [...args.races].sort((a, b) => a.round - b.round);
  const index = sorted.findIndex((r) => r.id === args.raceId);
  if (index === -1) {
    return { ok: false, error: "Race not found in this league." };
  }

  const race = sorted[index];
  if (race.status === "COMPLETED") {
    return { ok: false, error: "Completed races can't be reordered." };
  }

  const neighborIndex = args.direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0) {
    return { ok: false, error: "Already at the top of the schedule." };
  }
  if (neighborIndex >= sorted.length) {
    return { ok: false, error: "Already at the bottom of the schedule." };
  }

  const neighbor = sorted[neighborIndex];
  if (neighbor.status === "COMPLETED") {
    return { ok: false, error: "Can't move past a completed race." };
  }

  return { ok: true, swapWithRaceId: neighbor.id };
}

/** Whether a one-step move is allowed (for disabling UI controls). */
export function canMoveRace(
  races: readonly ReorderRaceSummary[],
  raceId: string,
  direction: "up" | "down",
): boolean {
  return validateRaceMove({ races, raceId, direction }).ok;
}
