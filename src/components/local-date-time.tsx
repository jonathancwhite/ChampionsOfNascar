"use client";

import { useSyncExternalStore } from "react";

// Renders a UTC timestamp in the viewer's local timezone with the zone labelled
// (NASCAR-042/050). Stored times are UTC; only the browser knows the viewer's
// zone. useSyncExternalStore returns the server snapshot (null) during SSR and
// hydration, then the client-formatted string — hydration-safe, no effect.
const emptySubscribe = () => () => {};

function formatLocal(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function LocalDateTime({
  value,
  fallback = "TBD",
}: {
  value: string | Date | null;
  fallback?: string;
}) {
  const text = useSyncExternalStore(
    emptySubscribe,
    () => (value ? formatLocal(value) : null),
    () => null,
  );

  if (!value) {
    return <span className="text-muted-foreground">{fallback}</span>;
  }

  return (
    <time dateTime={new Date(value).toISOString()} suppressHydrationWarning>
      {text ?? "…"}
    </time>
  );
}
