// Unit tests for timezone math (NASCAR-050 / 052). No DB. Relies only on the
// runtime's IANA tz data (Node ships full ICU), so these assert real DST offsets.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  daysBetweenYmd,
  daysUntilRace,
  toZonedInputValue,
  zonedDateString,
  zonedWallTimeToUtc,
} from "./timezone";

test("zonedWallTimeToUtc: EDT (summer) is UTC-4", () => {
  // 8:00 PM in New York on Jul 12 = 00:00 UTC on Jul 13.
  const utc = zonedWallTimeToUtc("2026-07-12T20:00", "America/New_York");
  assert.equal(utc.toISOString(), "2026-07-13T00:00:00.000Z");
});

test("zonedWallTimeToUtc: EST (winter) is UTC-5", () => {
  // 8:00 PM in New York on Jan 12 = 01:00 UTC on Jan 13.
  const utc = zonedWallTimeToUtc("2026-01-12T20:00", "America/New_York");
  assert.equal(utc.toISOString(), "2026-01-13T01:00:00.000Z");
});

test("zonedWallTimeToUtc: UTC zone is identity", () => {
  const utc = zonedWallTimeToUtc("2026-07-12T20:00", "UTC");
  assert.equal(utc.toISOString(), "2026-07-12T20:00:00.000Z");
});

test("zonedDateString reflects the local calendar day, not UTC", () => {
  // 00:00 UTC Jul 13 is still 8:00 PM Jul 12 in New York.
  const instant = new Date("2026-07-13T00:00:00Z");
  assert.equal(zonedDateString(instant, "America/New_York"), "2026-07-12");
  assert.equal(zonedDateString(instant, "UTC"), "2026-07-13");
});

test("wall→UTC→date round-trips to the entered local day", () => {
  const utc = zonedWallTimeToUtc("2026-07-12T20:00", "America/New_York");
  assert.equal(zonedDateString(utc, "America/New_York"), "2026-07-12");
});

test("daysBetweenYmd counts whole calendar days", () => {
  assert.equal(daysBetweenYmd("2026-07-07", "2026-07-12"), 5);
  assert.equal(daysBetweenYmd("2026-07-12", "2026-07-12"), 0);
  assert.equal(daysBetweenYmd("2026-07-13", "2026-07-12"), -1);
});

test("toZonedInputValue round-trips with zonedWallTimeToUtc", () => {
  const wall = "2026-07-12T20:00";
  const utc = zonedWallTimeToUtc(wall, "America/New_York");
  assert.equal(toZonedInputValue(utc, "America/New_York"), wall);
});

test("daysUntilRace uses the league zone (no off-by-one near midnight)", () => {
  // Race instant is 00:30 UTC Jul 12 — that's 8:30 PM Jul 11 in New York.
  const race = new Date("2026-07-12T00:30:00Z");
  // "Now" is mid-morning New York on Jul 6 → race local date Jul 11 is 5 days out.
  const now = new Date("2026-07-06T14:00:00Z");
  assert.equal(daysUntilRace(now, race, "America/New_York"), 5);
  // In UTC the race date is Jul 12, so the naive answer would be 6 — the bug we avoid.
  assert.equal(daysUntilRace(now, race, "UTC"), 6);
});
