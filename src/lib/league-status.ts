// League lifecycle status (NASCAR-022). Pure — shared by the dashboard,
// overview, and admin settings, and unit-testable with no database.

export const LEAGUE_STATUSES = ["setup", "active", "finished"] as const;
export type LeagueStatus = (typeof LEAGUE_STATUSES)[number];

export const LEAGUE_STATUS_LABELS: Record<LeagueStatus, string> = {
  setup: "Setup",
  active: "Active",
  finished: "Finished",
};

/** Human label for a status string, falling back to the raw value. */
export function leagueStatusLabel(status: string): string {
  return LEAGUE_STATUS_LABELS[status as LeagueStatus] ?? status;
}

// Forward-only lifecycle: setup → active → finished. Staying put is always
// allowed; reverting or skipping is not.
const NEXT: Record<LeagueStatus, LeagueStatus[]> = {
  setup: ["active"],
  active: ["finished"],
  finished: [],
};

export function isLeagueStatus(value: string): value is LeagueStatus {
  return (LEAGUE_STATUSES as readonly string[]).includes(value);
}

/** Whether an admin may move a league from `from` to `to`. */
export function isValidStatusTransition(from: string, to: string): boolean {
  if (!isLeagueStatus(from) || !isLeagueStatus(to)) return false;
  if (from === to) return true;
  return NEXT[from].includes(to);
}

/** Statuses an admin can select given the current one (current + valid nexts). */
export function allowedNextStatuses(from: string): LeagueStatus[] {
  if (!isLeagueStatus(from)) return [...LEAGUE_STATUSES];
  return [from, ...NEXT[from]];
}
