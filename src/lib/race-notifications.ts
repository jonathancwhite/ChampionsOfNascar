// Member-facing race notifications (NASCAR-051 scheduled, NASCAR-052 reminders,
// NASCAR-054 cancelled). Each sender loads recipients via getNotifiableMembers
// (opt-outs already filtered), and is idempotent through EmailLog dedupe keys:
// insert the log first, send only on a fresh insert, so re-runs never double-send.
// Individual send failures are logged and never throw — they must not block the
// admin action that triggered them.

import { EmailType } from "@/generated/prisma/enums";
import { RaceScheduledEmail } from "@/emails/race-scheduled";
import { prisma } from "@/lib/db";
import { buildUnsubscribeUrl, logEmail, sendEmail } from "@/lib/email";
import { clientEnv } from "@/lib/env";
import { getNotifiableMembers } from "@/lib/league-queries";
import { formatRaceDateTime } from "@/lib/timezone";

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
