// Render smoke tests for the email templates (NASCAR-053). Renders each to HTML
// with no DB or Resend, asserting the key dynamic content lands — a lightweight
// stand-in for the react-email preview, runnable in `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import { render } from "@react-email/components";

import { LeagueInviteEmail } from "./league-invite";
import { RaceReminderEmail } from "./race-reminder";
import { RaceScheduledEmail } from "./race-scheduled";

test("league invite renders with the league name and join link", async () => {
  const html = await render(
    <LeagueInviteEmail
      leagueName="Sunday Night Throwdown"
      inviterName="Dale"
      joinUrl="https://app.test/leagues/join?code=ABCD2345"
    />,
  );
  assert.match(html, /Sunday Night Throwdown/);
  assert.match(html, /Dale/);
  assert.match(html, /Champions of NASCAR/);
  assert.match(html, /leagues\/join\?code=ABCD2345/);
  // Invites have no unsubscribe link (recipient isn't a subscriber).
  assert.doesNotMatch(html, /unsubscribe/i);
});

test("race scheduled renders track, date, and an unsubscribe link", async () => {
  const html = await render(
    <RaceScheduledEmail
      leagueName="Sunday Night Throwdown"
      round={3}
      trackName="Talladega"
      dateText="Sun, Jul 12, 2026, 8:00 PM EDT"
      raceUrl="https://app.test/leagues/abc/races/xyz"
      unsubscribeUrl="https://app.test/unsubscribe?token=demo"
    />,
  );
  assert.match(html, /Talladega/);
  assert.match(html, /Jul 12, 2026/);
  assert.match(html, /unsubscribe\?token=demo/);
});

test("race reminder renders the days-until copy and unsubscribe link", async () => {
  const html = await render(
    <RaceReminderEmail
      leagueName="Sunday Night Throwdown"
      round={3}
      trackName="Talladega"
      dateText="Sun, Jul 12, 2026, 8:00 PM EDT"
      daysUntil={5}
      raceUrl="https://app.test/leagues/abc/races/xyz"
      unsubscribeUrl="https://app.test/unsubscribe?token=demo"
    />,
  );
  assert.match(html, /in 5 days/);
  assert.match(html, /unsubscribe\?token=demo/);
});
