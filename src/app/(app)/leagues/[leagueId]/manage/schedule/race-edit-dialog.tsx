"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { LocalDateTime } from "@/components/local-date-time";
import { RaceStatusBadge } from "@/components/race-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RaceStatus } from "@/generated/prisma/enums";
import type { ManageScheduleRound, TrackOption } from "@/lib/league-queries";
import { cn } from "@/lib/utils";

import {
  cancelRaceAction,
  reinstateRaceAction,
  setRaceDateAction,
  swapTrackAction,
} from "./actions";

const SELECT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3";

export function RaceEditDialog({
  leagueId,
  round,
  availableTracks,
  timezoneLabel,
  open,
  onOpenChange,
}: {
  leagueId: string;
  round: ManageScheduleRound;
  availableTracks: TrackOption[];
  timezoneLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [trackPick, setTrackPick] = useState("");
  const [dateInput, setDateInput] = useState(round.scheduledInput);

  const raceUrl = `/leagues/${leagueId}/races/${round.raceId}`;
  const resultsUrl = `${raceUrl}/results`;
  const noTracksLeft = availableTracks.length === 0;
  const isCompleted = round.status === RaceStatus.COMPLETED;

  function run(
    key: string,
    action: () => Promise<{ error?: string }>,
    onOk?: () => void,
  ) {
    setError(null);
    setActiveKey(key);
    startTransition(async () => {
      try {
        const res = await action();
        if (res.error) setError(res.error);
        else onOk?.();
      } finally {
        setActiveKey(null);
      }
    });
  }

  const setKey = `set-${round.raceId}`;
  const clearKey = `clear-${round.raceId}`;
  const cancelKey = `cancel-${round.raceId}`;
  const reinstateKey = `reinstate-${round.raceId}`;
  const swapKey = `swap-${round.raceId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Round {round.round}</DialogTitle>
          <DialogDescription>{round.trackName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Status</span>
            <RaceStatusBadge status={round.status} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Track</p>
            {round.canSwap && !noTracksLeft ? (
              <div className="flex gap-2">
                <select
                  aria-label={`Replacement track for round ${round.round}`}
                  className={cn(SELECT_CLASS, "min-w-0 flex-1")}
                  value={trackPick}
                  disabled={pending}
                  onChange={(e) => setTrackPick(e.target.value)}
                >
                  <option value="">Pick a track…</option>
                  {availableTracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  loading={activeKey === swapKey}
                  loadingText="Swapping…"
                  disabled={pending || !trackPick}
                  onClick={() =>
                    run(
                      swapKey,
                      () => swapTrackAction(leagueId, round.raceId, trackPick),
                      () => setTrackPick(""),
                    )
                  }
                >
                  Swap
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {round.trackName}
                {isCompleted
                  ? " — locked after completion"
                  : noTracksLeft
                    ? " — no spare tracks available"
                    : null}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Date &amp; time</p>
            {round.canEditDate ? (
              <>
                <p className="text-muted-foreground text-xs">
                  Times are in <strong>{timezoneLabel}</strong>.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="datetime-local"
                    value={dateInput}
                    disabled={pending}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full sm:w-auto sm:min-w-52"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    loading={activeKey === setKey}
                    loadingText="Setting…"
                    disabled={pending || !dateInput}
                    onClick={() =>
                      run(setKey, () =>
                        setRaceDateAction(
                          leagueId,
                          round.raceId,
                          dateInput || null,
                        ),
                      )
                    }
                  >
                    Set
                  </Button>
                  {round.scheduledAt ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={activeKey === clearKey}
                      loadingText="Clearing…"
                      disabled={pending}
                      onClick={() =>
                        run(
                          clearKey,
                          () => setRaceDateAction(leagueId, round.raceId, null),
                          () => setDateInput(""),
                        )
                      }
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                <LocalDateTime value={round.scheduledAt} />
              </p>
            )}
          </div>

          {round.status === RaceStatus.SCHEDULED ? (
            <Button
              size="sm"
              variant="ghost"
              loading={activeKey === cancelKey}
              loadingText="Cancelling…"
              disabled={pending}
              className="text-destructive hover:text-destructive h-auto px-0"
              onClick={() => {
                const reason = window.prompt(
                  `Cancel round ${round.round} (${round.trackName})? Members will be notified. Optional reason:`,
                );
                if (reason === null) return;
                run(cancelKey, () =>
                  cancelRaceAction(
                    leagueId,
                    round.raceId,
                    reason.trim() || null,
                  ),
                );
              }}
            >
              Cancel race
            </Button>
          ) : null}

          {round.status === RaceStatus.CANCELLED ? (
            <Button
              size="sm"
              variant="outline"
              loading={activeKey === reinstateKey}
              loadingText="Reinstating…"
              disabled={pending}
              onClick={() => {
                if (
                  !window.confirm(
                    `Reinstate round ${round.round}? It returns to scheduled with no date — re-date it to notify members.`,
                  )
                ) {
                  return;
                }
                run(reinstateKey, () =>
                  reinstateRaceAction(leagueId, round.raceId),
                );
              }}
            >
              Reinstate race
            </Button>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Link
              href={raceUrl}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View race
            </Link>
            {isCompleted ? (
              <Link
                href={resultsUrl}
                className={buttonVariants({ size: "sm" })}
              >
                View results
              </Link>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
