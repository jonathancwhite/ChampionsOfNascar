// Series constants — client-safe (no server imports), so both the create-league
// form (client) and the createLeague domain (server) can share them.

export const SERIES_VALUES = ["ARCA", "TRUCK", "XFINITY", "CUP"] as const;
export type SeriesValue = (typeof SERIES_VALUES)[number];

/** Human-friendly labels for the series select. */
export const SERIES_LABELS: Record<SeriesValue, string> = {
  ARCA: "ARCA",
  TRUCK: "Truck",
  XFINITY: "Xfinity",
  CUP: "Cup",
};
