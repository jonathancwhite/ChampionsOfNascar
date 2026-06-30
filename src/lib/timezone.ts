// Timezone math for race scheduling (NASCAR-050 / 052). Pure — only the built-in
// Intl API, no DB or `@/` value imports — so it unit-tests under the bare node
// runner. Races are stored as UTC instants (`scheduledAt`); the league's IANA
// zone is the reference for entry ("wall-clock in that zone") and for the
// reminder "N days before" boundary, which must be computed on the race's local
// date to avoid off-by-one across timezones.

/** IANA zones offered for a league. US-centric (NASCAR) plus a couple extras. */
export const LEAGUE_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "UTC",
] as const;

export type LeagueTimezone = (typeof LEAGUE_TIMEZONES)[number];

export const TIMEZONE_LABELS: Record<LeagueTimezone, string> = {
  "America/New_York": "Eastern (New York)",
  "America/Chicago": "Central (Chicago)",
  "America/Denver": "Mountain (Denver)",
  "America/Phoenix": "Mountain – no DST (Phoenix)",
  "America/Los_Angeles": "Pacific (Los Angeles)",
  "America/Anchorage": "Alaska (Anchorage)",
  "Pacific/Honolulu": "Hawaii (Honolulu)",
  "Europe/London": "UK (London)",
  UTC: "UTC",
};

export const DEFAULT_TIMEZONE: LeagueTimezone = "America/New_York";

export function isLeagueTimezone(value: string): value is LeagueTimezone {
  return (LEAGUE_TIMEZONES as readonly string[]).includes(value);
}

/**
 * The offset (ms) to ADD to a UTC instant to get the wall-clock time in
 * `timeZone` — i.e. the zone's UTC offset at that instant (negative west of
 * UTC). Derived from how `Intl` renders the instant in the zone.
 */
export function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

/**
 * Convert a wall-clock string ("YYYY-MM-DDTHH:mm", as produced by a
 * `datetime-local` input) interpreted in `timeZone` to the UTC instant.
 * ponytail: the offset is sampled at the wall time treated as UTC, so a time
 * landing inside a DST transition can be off by the transition's hour — fine for
 * race scheduling; swap in a tz library if sub-hour DST-edge accuracy matters.
 */
export function zonedWallTimeToUtc(wall: string, timeZone: string): Date {
  const padded = wall.length === 16 ? `${wall}:00` : wall; // ensure seconds
  const naiveUtc = new Date(`${padded}Z`);
  if (Number.isNaN(naiveUtc.getTime())) {
    throw new Error(`Invalid date/time: ${wall}`);
  }
  const offset = tzOffsetMs(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - offset);
}

/** The calendar date (YYYY-MM-DD) that `instant` falls on in `timeZone`. */
export function zonedDateString(instant: Date, timeZone: string): string {
  // en-CA renders ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Whole days from `a` to `b` (both YYYY-MM-DD), i.e. b − a. */
export function daysBetweenYmd(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

/**
 * Whole days from `now`'s local date to the race's local date, both evaluated in
 * `timeZone`. The reminder cron (NASCAR-052) fires when this equals the league's
 * lead days. Negative once the race date has passed.
 */
export function daysUntilRace(
  now: Date,
  scheduledAt: Date,
  timeZone: string,
): number {
  return daysBetweenYmd(
    zonedDateString(now, timeZone),
    zonedDateString(scheduledAt, timeZone),
  );
}

/**
 * Render a UTC instant as a `datetime-local` input value ("YYYY-MM-DDTHH:mm")
 * showing the wall-clock in `timeZone`. Inverse of `zonedWallTimeToUtc`, for
 * pre-filling the date editor (NASCAR-050).
 */
export function toZonedInputValue(instant: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") p[part.type] = part.value;
  }
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Human race date/time in the league zone, with the zone abbreviation. */
export function formatRaceDateTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(instant);
}
