// Member-facing race notifications (NASCAR-051 scheduled, NASCAR-052 reminders,
// NASCAR-054 cancelled). Each sender loads recipients via getNotifiableMembers
// (opt-outs already filtered), and is idempotent through EmailLog dedupe keys:
// insert the log first, send only on a fresh insert, so re-runs never double-send.
// Individual send failures are logged and never throw — they must not block the
// admin action that triggered them.

import { EmailType } from "@/generated/prisma/enums";
import { RaceCancelledEmail } from "@/emails/race-cancelled";
import { RaceReminderEmail } from "@/emails/race-reminder";
import { RaceScheduledEmail } from "@/emails/race-scheduled";
import { prisma } from "@/lib/db";
import { buildUnsubscribeUrl, logEmail, sendEmail } from "@/lib/email";
import { clientEnv } from "@/lib/env";
import { getNotifiableMembers } from "@/lib/league-queries";
import { daysUntilRace, formatRaceDateTime } from "@/lib/timezone";

function raceUrl(leagueId: string, raceId: string): string {
  return `${clientEnv.NEXT_PUBLIC_APP_URL}/leagues/${leagueId}/races/${raceId}`;
}

/**
 * Email all current members that a race has been dated/rescheduled (NASCAR-051).
 * Dedupe is per (race, date, recipient) — `${raceId}:RACE_SCHEDULED:${iso}:${userId}`
 * — so re-saving the same date sends nothing, while a new date sends a fresh
 * notice (and newly-joined members get it too). No-op when the date is cleared.
 */
export async function notifyRaceScheduled(raceId: string): Promise<void> {
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    select: {
      id: true,
      leagueId: true,
      round: true,
      scheduledAt: true,
      track: { select: { name: true } },
      league: { select: { name: true, timezone: true } },
    },
  });
  if (!race || !race.scheduledAt) return;

  const iso = race.scheduledAt.toISOString();
  const dateText = formatRaceDateTime(race.scheduledAt, race.league.timezone);
  const url = raceUrl(race.leagueId, race.id);
  const members = await getNotifiableMembers(race.leagueId);

  for (const member of members) {
    const dedupeKey = `${race.id}:RACE_SCHEDULED:${iso}:${member.userId}`;
    const logged = await logEmail({
      type: EmailType.RACE_SCHEDULED,
      email: member.email,
      dedupeKey,
      raceId: race.id,
      userId: member.userId,
    });
    if (logged === "duplicate") continue;

    const result = await sendEmail({
      to: member.email,
      subject: `Round ${race.round}: ${race.track.name} is scheduled`,
      react: RaceScheduledEmail({
        leagueName: race.league.name,
        round: race.round,
        trackName: race.track.name,
        dateText,
        raceUrl: url,
        unsubscribeUrl: buildUnsubscribeUrl(member.membershipId),
      }),
    });
    if (!result.ok) {
      console.error(
        `[race-scheduled] send failed for ${member.email}: ${result.error}`,
      );
    }
  }
}

/**
 * Email all current members that a race has been cancelled (NASCAR-054). Dedupe
 * is per (race, recipient) — `${raceId}:RACE_CANCELLED:${userId}`. ponytail: this
 * sends a single cancellation notice per race ever; a reinstate→re-cancel cycle
 * won't re-notify (rare; add a cancel counter to the key if it matters).
 */
export async function notifyRaceCancelled(
  raceId: string,
  reason: string | null,
): Promise<void> {
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    select: {
      id: true,
      leagueId: true,
      round: true,
      track: { select: { name: true } },
      league: { select: { name: true } },
    },
  });
  if (!race) return;

  const url = raceUrl(race.leagueId, race.id);
  const members = await getNotifiableMembers(race.leagueId);

  for (const member of members) {
    const dedupeKey = `${race.id}:RACE_CANCELLED:${member.userId}`;
    const logged = await logEmail({
      type: EmailType.RACE_CANCELLED,
      email: member.email,
      dedupeKey,
      raceId: race.id,
      userId: member.userId,
    });
    if (logged === "duplicate") continue;

    const result = await sendEmail({
      to: member.email,
      subject: `Round ${race.round}: ${race.track.name} is cancelled`,
      react: RaceCancelledEmail({
        leagueName: race.league.name,
        round: race.round,
        trackName: race.track.name,
        reason: reason ?? undefined,
        raceUrl: url,
        unsubscribeUrl: buildUnsubscribeUrl(member.membershipId),
      }),
    });
    if (!result.ok) {
      console.error(
        `[race-cancelled] send failed for ${member.email}: ${result.error}`,
      );
    }
  }
}

export type ReminderRunResult = {
  racesConsidered: number;
  remindersSent: number;
};

/**
 * Send lead-time reminders for any SCHEDULED, dated race whose local race date
 * (in the league timezone) is exactly `reminderLeadDays` out from `now`
 * (NASCAR-052). Dedupe is per (race, recipient) — `${raceId}:RACE_REMINDER:${userId}`
 * — so the daily cron sends each reminder at most once. `now` is injected so the
 * boundary is testable and the cron can pass the request time. CANCELLED and
 * COMPLETED races are excluded by the SCHEDULED filter.
 */
export async function sendRaceReminders(now: Date): Promise<ReminderRunResult> {
  // Bound the scan to a sensible window (max configurable lead time is 30 days).
  const horizon = new Date(now.getTime() + 31 * 86_400_000);
  const races = await prisma.race.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { gte: now, lte: horizon },
    },
    select: {
      id: true,
      leagueId: true,
      round: true,
      scheduledAt: true,
      track: { select: { name: true } },
      league: {
        select: { name: true, timezone: true, reminderLeadDays: true },
      },
    },
  });

  let remindersSent = 0;
  let racesConsidered = 0;

  for (const race of races) {
    if (!race.scheduledAt) continue;
    const daysOut = daysUntilRace(now, race.scheduledAt, race.league.timezone);
    if (daysOut !== race.league.reminderLeadDays) continue;
    racesConsidered += 1;

    const dateText = formatRaceDateTime(race.scheduledAt, race.league.timezone);
    const url = raceUrl(race.leagueId, race.id);
    const members = await getNotifiableMembers(race.leagueId);

    for (const member of members) {
      const dedupeKey = `${race.id}:RACE_REMINDER:${member.userId}`;
      const logged = await logEmail({
        type: EmailType.RACE_REMINDER,
        email: member.email,
        dedupeKey,
        raceId: race.id,
        userId: member.userId,
      });
      if (logged === "duplicate") continue;

      const result = await sendEmail({
        to: member.email,
        subject: `Reminder: Round ${race.round} at ${race.track.name} in ${daysOut} days`,
        react: RaceReminderEmail({
          leagueName: race.league.name,
          round: race.round,
          trackName: race.track.name,
          dateText,
          daysUntil: daysOut,
          raceUrl: url,
          unsubscribeUrl: buildUnsubscribeUrl(member.membershipId),
        }),
      });
      if (result.ok) {
        remindersSent += 1;
      } else {
        console.error(
          `[race-reminder] send failed for ${member.email}: ${result.error}`,
        );
      }
    }
  }

  return { racesConsidered, remindersSent };
}
