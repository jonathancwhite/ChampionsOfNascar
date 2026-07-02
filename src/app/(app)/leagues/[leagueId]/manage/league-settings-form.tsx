"use client";

import { useActionState, useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allowedNextStatuses, LEAGUE_STATUS_LABELS } from "@/lib/league-status";
import type { LeagueSettings } from "@/lib/league-queries";
import { SERIES_LABELS, type SeriesValue } from "@/lib/series";
import { LEAGUE_TIMEZONES, TIMEZONE_LABELS } from "@/lib/timezone";
import { cn } from "@/lib/utils";

import { updateLeagueSettingsAction, type ManageLeagueState } from "./actions";

const initialState: ManageLeagueState = {};

function FieldNote({ error, hint }: { error?: string; hint?: string }) {
  if (error) return <p className="text-destructive mt-1 text-sm">{error}</p>;
  if (hint) return <p className="text-muted-foreground mt-1 text-sm">{hint}</p>;
  return null;
}

export function LeagueSettingsForm({
  settings,
  maxRaces,
}: {
  settings: LeagueSettings;
  maxRaces: number;
}) {
  const [state, formAction, pending] = useActionState(
    updateLeagueSettingsAction,
    initialState,
  );

  const ids = {
    name: useId(),
    laps: useId(),
    reminder: useId(),
    timezone: useId(),
    status: useId(),
    races: useId(),
  };
  const selectClass =
    "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-full rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 md:text-sm";
  const fieldErrors = state.fieldErrors ?? {};
  const statusOptions = allowedNextStatuses(settings.status);
  const raceCountLocked = settings.status === "finished";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const newCount = Number(new FormData(form).get("numberOfRaces"));
    if (
      Number.isInteger(newCount) &&
      newCount < settings.numberOfRaces &&
      !window.confirm(
        `Reduce the schedule from ${settings.numberOfRaces} to ${newCount} races? Tail rounds and any scheduled dates on removed races will be lost.`,
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} className="space-y-5" onSubmit={handleSubmit}>
      <input type="hidden" name="leagueId" value={settings.id} />

      {state.error ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="border-primary/30 bg-primary/10 text-primary rounded-lg border px-3 py-2 text-sm">
          Settings saved.
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
          defaultValue={settings.name}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        <FieldNote error={fieldErrors.name} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={ids.laps}
            className="mb-1.5 block text-sm font-medium"
          >
            Race length (% of laps)
          </label>
          <Input
            id={ids.laps}
            name="lapsPercent"
            type="number"
            required
            min={1}
            max={100}
            defaultValue={settings.lapsPercent}
            aria-invalid={Boolean(fieldErrors.lapsPercent)}
          />
          <FieldNote error={fieldErrors.lapsPercent} hint="1–100%" />
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
            defaultValue={settings.reminderLeadDays}
            aria-invalid={Boolean(fieldErrors.reminderLeadDays)}
          />
          <FieldNote
            error={fieldErrors.reminderLeadDays}
            hint="Applies to future reminders only"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={ids.races}
            className="mb-1.5 block text-sm font-medium"
          >
            Number of races
          </label>
          <Input
            id={ids.races}
            name="numberOfRaces"
            type="number"
            required
            min={1}
            max={maxRaces}
            defaultValue={settings.numberOfRaces}
            disabled={raceCountLocked}
            aria-invalid={Boolean(fieldErrors.numberOfRaces)}
          />
          <FieldNote
            error={fieldErrors.numberOfRaces}
            hint={
              raceCountLocked
                ? "Locked for finished leagues"
                : `1–${maxRaces} (track pool). Adds or removes tail rounds.`
            }
          />
        </div>

        <div className="border-border bg-muted/30 flex flex-col justify-center rounded-lg border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Series</span>
            <span className="font-medium">
              {SERIES_LABELS[settings.series as SeriesValue] ?? settings.series}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Series is fixed after the schedule is generated.
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor={ids.timezone}
          className="mb-1.5 block text-sm font-medium"
        >
          Race timezone
        </label>
        <select
          id={ids.timezone}
          name="timezone"
          defaultValue={settings.timezone}
          className={cn(selectClass)}
        >
          {LEAGUE_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {TIMEZONE_LABELS[tz]}
            </option>
          ))}
        </select>
        <FieldNote
          error={fieldErrors.timezone}
          hint="Race times are entered and reminders are timed in this zone"
        />
      </div>

      <div>
        <label
          htmlFor={ids.status}
          className="mb-1.5 block text-sm font-medium"
        >
          Status
        </label>
        <select
          id={ids.status}
          name="status"
          defaultValue={settings.status}
          className={cn(selectClass)}
        >
          {statusOptions.map((value) => (
            <option key={value} value={value}>
              {LEAGUE_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <FieldNote
          error={fieldErrors.status}
          hint="Setup → Active → Finished (forward only)"
        />
      </div>

      <div className="pt-1">
        <Button type="submit" loading={pending} loadingText="Saving…">
          Save settings
        </Button>
      </div>
    </form>
  );
}
