"use server";

import { revalidatePath } from "next/cache";

import { LeagueRole } from "@/generated/prisma/enums";
import { requireLeagueRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelRace, reinstateRace, setRaceDate } from "@/lib/race-admin";
import { swapTrack } from "@/lib/schedule";

export type SwapState = { ok?: boolean; error?: string };

export type DateState = { ok?: boolean; error?: string };

/**
 * Set or clear a race's date/time (NASCAR-050). Re-checks ADMIN, stores the date
 * (UTC, converted from the league-zone wall clock), then revalidates. The
 * "race scheduled" email (NASCAR-051) is triggered from the domain.
 */
export async function setRaceDateAction(
  leagueId: string,
  raceId: string,
  wallClock: string | null,
): Promise<DateState> {
  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return {
      error:
        authz.reason === "unauthenticated"
          ? "You must be signed in."
          : "Only admins can set race dates.",
    };
  }

  const result = await setRaceDate(leagueId, raceId, wallClock);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/manage/schedule`);
  revalidatePath(`/leagues/${leagueId}/races/${raceId}`);
  return { ok: true };
}

function denyReason(reason: "unauthenticated" | string): string {
  return reason === "unauthenticated"
    ? "You must be signed in."
    : "Only admins can change the schedule.";
}

/** Cancel a scheduled race (NASCAR-054). Members are notified. */
export async function cancelRaceAction(
  leagueId: string,
  raceId: string,
  reason: string | null,
): Promise<DateState> {
  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) return { error: denyReason(authz.reason) };

  const result = await cancelRace(leagueId, raceId, reason);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/manage/schedule`);
  revalidatePath(`/leagues/${leagueId}/races/${raceId}`);
  return { ok: true };
}

/** Reinstate a cancelled race back to scheduled, cleared to TBD (NASCAR-054). */
export async function reinstateRaceAction(
  leagueId: string,
  raceId: string,
): Promise<DateState> {
  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) return { error: denyReason(authz.reason) };

  const result = await reinstateRace(leagueId, raceId);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/manage/schedule`);
  revalidatePath(`/leagues/${leagueId}/races/${raceId}`);
  return { ok: true };
}

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
