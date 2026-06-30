"use server";

import { revalidatePath } from "next/cache";

import { LeagueRole } from "@/generated/prisma/enums";
import { requireLeagueRole } from "@/lib/auth";
import { parsePointsTable, updatePointsScheme } from "@/lib/leagues";
import { recomputeLeaguePoints } from "@/lib/results";

export type PointsState = { saved?: boolean; error?: string };

/**
 * Save a league's custom points scheme (NASCAR-023). Re-checks ADMIN, parses the
 * free-text table, validates + persists. Recompute of existing results is a
 * separate, explicit step (offered after a successful save).
 */
export async function updatePointsAction(
  _prevState: PointsState,
  formData: FormData,
): Promise<PointsState> {
  const leagueId = String(formData.get("leagueId") ?? "");

  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return {
      error:
        authz.reason === "unauthenticated"
          ? "You must be signed in."
          : "Only admins can edit scoring.",
    };
  }

  const result = await updatePointsScheme(leagueId, {
    table: parsePointsTable(String(formData.get("table") ?? "")),
    win: Number(formData.get("win") ?? 0),
    lapsLed: Number(formData.get("lapsLed") ?? 0),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/leagues/${leagueId}/manage`);
  return { saved: true };
}

export type RecomputeState = {
  resultsUpdated?: number;
  error?: string;
};

/** Recompute every completed race's points under the current scheme (NASCAR-062). */
export async function recomputePointsAction(
  leagueId: string,
): Promise<RecomputeState> {
  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return {
      error:
        authz.reason === "unauthenticated"
          ? "You must be signed in."
          : "Only admins can recompute scoring.",
    };
  }

  const result = await recomputeLeaguePoints(leagueId);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/standings`);
  return { resultsUpdated: result.resultsUpdated };
}
