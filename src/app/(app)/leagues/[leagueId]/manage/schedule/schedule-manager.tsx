"use client";

import { useState } from "react";

import { LocalDateTime } from "@/components/local-date-time";
import { RaceStatusBadge } from "@/components/race-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ManageScheduleRound, TrackOption } from "@/lib/league-queries";

import { RaceEditDialog } from "./race-edit-dialog";

const CLICKABLE_ROW =
  "cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Admin schedule manager (NASCAR-085). Click a row to open the race edit
 * dialog — set dates, swap tracks, cancel/reinstate. Completed rounds are
 * read-only in the dialog.
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
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);

  const selectedRound = rounds.find((r) => r.raceId === selectedRaceId) ?? null;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Click a row to edit. Race times are in <strong>{timezoneLabel}</strong>;
        members see them in their own timezone.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rd</TableHead>
            <TableHead>Track</TableHead>
            <TableHead>Date &amp; time</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rounds.map((round) => (
            <TableRow
              key={round.raceId}
              className={CLICKABLE_ROW}
              tabIndex={0}
              role="button"
              aria-label={`Edit round ${round.round}, ${round.trackName}`}
              onClick={() => setSelectedRaceId(round.raceId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedRaceId(round.raceId);
                }
              }}
            >
              <TableCell className="tabular-nums">{round.round}</TableCell>
              <TableCell className="font-medium">{round.trackName}</TableCell>
              <TableCell>
                <LocalDateTime value={round.scheduledAt} />
              </TableCell>
              <TableCell className="text-right">
                <RaceStatusBadge status={round.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedRound ? (
        <RaceEditDialog
          key={selectedRound.raceId}
          leagueId={leagueId}
          round={selectedRound}
          availableTracks={availableTracks}
          timezoneLabel={timezoneLabel}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedRaceId(null);
          }}
        />
      ) : null}
    </div>
  );
}
