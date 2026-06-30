"use client";

import { useState, useTransition } from "react";

import { LocalDateTime } from "@/components/local-date-time";
import { RaceStatusBadge } from "@/components/race-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ManageScheduleRound, TrackOption } from "@/lib/league-queries";
import { cn } from "@/lib/utils";

import {
  cancelRaceAction,
  reinstateRaceAction,
  setRaceDateAction,
  swapTrackAction,
} from "./actions";

const SELECT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 rounded-lg border bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3";

/**
 * Admin schedule manager (NASCAR-041 track swap + NASCAR-050 dates). Each
 * SCHEDULED round can be re-dated (times are in the league timezone) or have its
 * track swapped. Completed rounds are read-only. Mutations call the server
 * actions; on success the page revalidates and these props refresh.
 */
export function ScheduleManager({
  leagueId,
  rounds,
  availableTracks,
  timezoneLabel,
}: {
  leagueId: string;
  rounds: ManageScheduleRound[];
  availableTracks: TrackOption[];
  timezoneLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(rounds.map((r) => [r.raceId, r.scheduledInput])),
  );

  function run(action: () => Promise<{ error?: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
      else onOk?.();
    });
  }

  const noTracksLeft = availableTracks.length === 0;

  return (
    <div className="space-y-3">
      {error ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Race times are in <strong>{timezoneLabel}</strong>. Members see them in
        their own timezone.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rd</TableHead>
            <TableHead>Track</TableHead>
            <TableHead>Date &amp; time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Swap track</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rounds.map((round) => (
            <TableRow key={round.raceId}>
              <TableCell className="tabular-nums">{round.round}</TableCell>
              <TableCell className="font-medium">{round.trackName}</TableCell>
              <TableCell>
                {round.canEditDate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={dates[round.raceId] ?? ""}
                      disabled={pending}
                      onChange={(e) =>
                        setDates((prev) => ({
                          ...prev,
                          [round.raceId]: e.target.value,
                        }))
                      }
                      className="w-52"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || !dates[round.raceId]}
                      onClick={() =>
                        run(() =>
                          setRaceDateAction(
                            leagueId,
                            round.raceId,
                            dates[round.raceId] || null,
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
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              setRaceDateAction(leagueId, round.raceId, null),
                            () =>
                              setDates((prev) => ({
                                ...prev,
                                [round.raceId]: "",
                              })),
                          )
                        }
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <LocalDateTime value={round.scheduledAt} />
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1.5">
                  <RaceStatusBadge status={round.status} />
                  {round.status === "SCHEDULED" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      className="text-destructive hover:text-destructive h-auto px-0 py-0 text-xs"
                      onClick={() => {
                        const reason = window.prompt(
                          `Cancel round ${round.round} (${round.trackName})? Members will be notified. Optional reason:`,
                        );
                        // prompt returns null when the admin dismisses it.
                        if (reason === null) return;
                        run(() =>
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
                  {round.status === "CANCELLED" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      className="h-auto px-0 py-0 text-xs"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Reinstate round ${round.round}? It returns to scheduled with no date — re-date it to notify members.`,
                          )
                        ) {
                          return;
                        }
                        run(() => reinstateRaceAction(leagueId, round.raceId));
                      }}
                    >
                      Reinstate
                    </Button>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {!round.canSwap ? (
                  <span className="text-muted-foreground text-xs">
                    Locked (completed)
                  </span>
                ) : noTracksLeft ? (
                  <span className="text-muted-foreground text-xs">
                    No spare tracks
                  </span>
                ) : (
                  <div className="flex justify-end gap-2">
                    <select
                      aria-label={`Replacement track for round ${round.round}`}
                      className={cn(SELECT_CLASS)}
                      value={picks[round.raceId] ?? ""}
                      disabled={pending}
                      onChange={(e) =>
                        setPicks((prev) => ({
                          ...prev,
                          [round.raceId]: e.target.value,
                        }))
                      }
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
                      disabled={pending || !picks[round.raceId]}
                      onClick={() =>
                        run(
                          () =>
                            swapTrackAction(
                              leagueId,
                              round.raceId,
                              picks[round.raceId],
                            ),
                          () =>
                            setPicks((prev) => ({
                              ...prev,
                              [round.raceId]: "",
                            })),
                        )
                      }
                    >
                      Swap
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
