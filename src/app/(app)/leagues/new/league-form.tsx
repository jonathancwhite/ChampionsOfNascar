"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SERIES_LABELS, SERIES_VALUES, type SeriesValue } from "@/lib/series";

import { createLeagueAction, type CreateLeagueState } from "./actions";

const initialState: CreateLeagueState = {};

/** Small inline field-error / hint line. */
function FieldNote({ error, hint }: { error?: string; hint?: string }) {
  if (error) {
    return <p className="text-destructive mt-1 text-sm">{error}</p>;
  }
  if (hint) {
    return <p className="text-muted-foreground mt-1 text-sm">{hint}</p>;
  }
  return null;
}

export function LeagueForm({
  trackCounts,
}: {
  trackCounts: Record<SeriesValue, number>;
}) {
  const [state, formAction, pending] = useActionState(
    createLeagueAction,
    initialState,
  );

  const [series, setSeries] = useState<SeriesValue>("CUP");
  const [numberOfRaces, setNumberOfRaces] = useState(12);

  // Cap-at-pool: the schedule can't be longer than the series' track pool.
  const maxRaces = trackCounts[series] || 1;
  const racesValue = Math.min(numberOfRaces, maxRaces);

  const ids = {
    name: useId(),
    series: useId(),
    races: useId(),
    laps: useId(),
    reminder: useId(),
  };

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor={ids.name} className="mb-1.5 block text-sm font-medium">
          League name
        </label>
        <Input
          id={ids.name}
          name="name"
          required
          maxLength={80}
          placeholder="Sunday Night Throwdown"
          aria-invalid={Boolean(fieldErrors.name)}
        />
        <FieldNote error={fieldErrors.name} />
      </div>

      <div>
        <label
          htmlFor={ids.series}
          className="mb-1.5 block text-sm font-medium"
        >
          Series
        </label>
        <select
          id={ids.series}
          name="series"
          value={series}
          onChange={(e) => setSeries(e.target.value as SeriesValue)}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-full rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 md:text-sm",
          )}
        >
          {SERIES_VALUES.map((value) => (
            <option key={value} value={value}>
              {SERIES_LABELS[value]} ({trackCounts[value]} tracks)
            </option>
          ))}
        </select>
        <FieldNote error={fieldErrors.series} />
      </div>

      <div>
        <label htmlFor={ids.races} className="mb-1.5 block text-sm font-medium">
          Number of races
        </label>
        <Input
          id={ids.races}
          name="numberOfRaces"
          type="number"
          required
          min={1}
          max={maxRaces}
          value={racesValue}
          onChange={(e) => setNumberOfRaces(Number(e.target.value))}
          aria-invalid={Boolean(fieldErrors.numberOfRaces)}
        />
        <FieldNote
          error={fieldErrors.numberOfRaces}
          hint={`1–${maxRaces} (track pool for ${SERIES_LABELS[series]})`}
        />
      </div>

      <div>
        <label htmlFor={ids.laps} className="mb-1.5 block text-sm font-medium">
          Race length (% of laps)
        </label>
        <Input
          id={ids.laps}
          name="lapsPercent"
          type="number"
          required
          min={1}
          max={100}
          defaultValue={50}
          aria-invalid={Boolean(fieldErrors.lapsPercent)}
        />
        <FieldNote
          error={fieldErrors.lapsPercent}
          hint="1–100% of full race distance"
        />
      </div>

      <div>
        <label
          htmlFor={ids.reminder}
          className="mb-1.5 block text-sm font-medium"
        >
          Reminder lead time (days)
        </label>
        <Input
          id={ids.reminder}
          name="reminderLeadDays"
          type="number"
          min={0}
          max={30}
          defaultValue={5}
          aria-invalid={Boolean(fieldErrors.reminderLeadDays)}
        />
        <FieldNote
          error={fieldErrors.reminderLeadDays}
          hint="Days before a race to email members"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={pending} loadingText="Creating…">
          Create league
        </Button>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "ghost" })}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
