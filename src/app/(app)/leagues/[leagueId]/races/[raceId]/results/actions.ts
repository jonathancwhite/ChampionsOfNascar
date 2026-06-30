"use server";

import { revalidatePath } from "next/cache";

import { LeagueRole } from "@/generated/prisma/enums";
import { requireLeagueRole } from "@/lib/auth";
import { saveRaceResults, type ResultEntry } from "@/lib/results";

export type ResultsState = { ok?: boolean; error?: string };

/**
 * Enter or edit a race's results (NASCAR-061 / NASCAR-062). Re-checks ADMIN,
 * records the editor for the audit, then delegates to saveRaceResults (which
 * validates the finishing order, computes points, and completes the race).
 */
export async function saveResultsAction(
  leagueId: string,
  raceId: string,
  entries: ResultEntry[],
): Promise<ResultsState> {
  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return {
      error:
        authz.reason === "unauthenticated"
          ? "You must be signed in."
          : "Only admins can enter results.",
    };
  }

  const result = await saveRaceResults(leagueId, raceId, authz.userId, entries);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/standings`);
  revalidatePath(`/leagues/${leagueId}/races/${raceId}`);
  return { ok: true };
}
