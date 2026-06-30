// Admin race-schedule mutations (NASCAR-050 set/clear date, NASCAR-054 cancel /
// reinstate). Stores `scheduledAt` as a UTC instant converted from the admin's
// wall-clock entry in the league timezone. Authorization is the caller's job
// (the server actions re-check requireLeagueRole ADMIN). Member notifications
// (NASCAR-051/054) are triggered by the callers after a successful change.

import { RaceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { notifyRaceScheduled } from "@/lib/race-notifications";
import { zonedWallTimeToUtc } from "@/lib/timezone";

export type SetRaceDateResult =
  | { ok: true; raceId: string; scheduledAt: Date | null }
  | { ok: false; error: string };

/**
 * Set or clear a scheduled race's date (NASCAR-050). `wallClock` is a
 * "YYYY-MM-DDTHH:mm" string in the league's timezone (empty/null clears the date
 * → TBD). Only SCHEDULED races can be dated; cancel/complete have their own
 * flows. Returns the stored UTC instant so the caller can notify members.
 */
export async function setRaceDate(
  leagueId: string,
  raceId: string,
  wallClock: string | null,
): Promise<SetRaceDateResult> {
  const race = await prisma.race.findFirst({
    where: { id: raceId, leagueId },
    select: { status: true, league: { select: { timezone: true } } },
  });
  if (!race) return { ok: false, error: "Race not found in this league." };
  if (race.status !== RaceStatus.SCHEDULED) {
    return { ok: false, error: "Only scheduled races can be dated." };
  }

  let scheduledAt: Date | null = null;
  if (wallClock && wallClock.trim() !== "") {
    try {
      scheduledAt = zonedWallTimeToUtc(wallClock.trim(), race.league.timezone);
    } catch {
      return { ok: false, error: "Enter a valid date and time." };
    }
  }

  await prisma.race.update({
    where: { id: raceId },
    data: { scheduledAt },
  });

  // Setting/changing the date notifies members (NASCAR-051); clearing it (TBD)
  // does not. A notification problem must not fail the date change.
  if (scheduledAt) {
    try {
      await notifyRaceScheduled(raceId);
    } catch (error) {
      console.error(`[setRaceDate] notification failed for ${raceId}:`, error);
    }
  }

  return { ok: true, raceId, scheduledAt };
}
