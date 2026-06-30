"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { RaceStatusBadge } from "@/components/race-status-badge";
import { LocalDateTime } from "@/components/local-date-time";
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

import { swapTrackAction } from "./actions";

const SELECT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 rounded-lg border bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3";

/**
 * Admin track-swap UI (NASCAR-041). Each round that isn't completed gets a
 * picker of available tracks (series pool minus tracks already used) and a Swap
 * button. Swaps call the server action; on success the page revalidates and the
 * available-tracks list refreshes.
 */
export function ScheduleManager({
  leagueId,
  rounds,
  availableTracks,
}: {
  leagueId: string;
  rounds: ManageScheduleRound[];
  availableTracks: TrackOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Selected replacement track per raceId.
  const [picks, setPicks] = useState<Record<string, string>>({});

  function swap(raceId: string) {
    const newTrackId = picks[raceId];
    if (!newTrackId) return;
    setError(null);
    startTransition(async () => {
      const res = await swapTrackAction(leagueId, raceId, newTrackId);
      if (res.error) {
        setError(res.error);
      } else {
        setPicks((prev) => ({ ...prev, [raceId]: "" }));
      }
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Round</TableHead>
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
                <LocalDateTime value={round.scheduledAt} />
              </TableCell>
              <TableCell>
                <RaceStatusBadge status={round.status} />
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
                      onClick={() => swap(round.raceId)}
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
