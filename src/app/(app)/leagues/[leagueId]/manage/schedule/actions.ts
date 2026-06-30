"use server";

import { revalidatePath } from "next/cache";

import { LeagueRole } from "@/generated/prisma/enums";
import { requireLeagueRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { swapTrack } from "@/lib/schedule";

export type SwapState = { ok?: boolean; error?: string };

/**
 * Swap a race's track (NASCAR-041). Re-checks ADMIN authorization server-side,
 * then delegates the series / no-repeat / completed-race rules to swapTrack.
 * No re-notification: a pure track swap leaves `scheduledAt` untouched.
 */
export async function swapTrackAction(
  leagueId: string,
  raceId: string,
  newTrackId: string,
): Promise<SwapState> {
  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return {
      error:
        authz.reason === "unauthenticated"
          ? "You must be signed in."
          : "Only admins can edit the schedule.",
    };
  }

  const result = await swapTrack(prisma, { leagueId, raceId, newTrackId });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/manage/schedule`);
  return { ok: true };
}
