"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useTransition } from "react";

import { LocalDateTime } from "@/components/local-date-time";
import { RaceStatusBadge } from "@/components/race-status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RaceStatus } from "@/generated/prisma/enums";
import type { ManageScheduleRound, TrackOption } from "@/lib/league-queries";
import { canMoveRace } from "@/lib/schedule-reorder";

import { moveRaceAction } from "./actions";
import { RaceEditDialog } from "./race-edit-dialog";

const CLICKABLE_ROW =
  "cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Admin schedule manager (NASCAR-085 row edit, NASCAR-089 reorder). Click a row
 * to edit; use arrows to move a race up or down. Completed rounds are pinned.
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
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedRound = rounds.find((r) => r.raceId === selectedRaceId) ?? null;
  const reorderRaces = rounds.map((r) => ({
    id: r.raceId,
    round: r.round,
    status: r.status,
  }));

  function runMove(raceId: string, direction: "up" | "down") {
    const key = `${direction}-${raceId}`;
    setError(null);
    setActiveKey(key);
    startTransition(async () => {
      try {
        const res = await moveRaceAction(leagueId, raceId, direction);
        if (res.error) setError(res.error);
      } finally {
        setActiveKey(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Click a row to edit. Use arrows to reorder — completed races stay
        pinned. Times are in <strong>{timezoneLabel}</strong>.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rd</TableHead>
            <TableHead>Track</TableHead>
            <TableHead>Date &amp; time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24 text-right">Order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rounds.map((round) => {
            const upKey = `up-${round.raceId}`;
            const downKey = `down-${round.raceId}`;
            const canUp = canMoveRace(reorderRaces, round.raceId, "up");
            const canDown = canMoveRace(reorderRaces, round.raceId, "down");
            const isCompleted = round.status === RaceStatus.COMPLETED;

            return (
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
                <TableCell>
                  <RaceStatusBadge status={round.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div
                    className="flex justify-end gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Move round ${round.round} up`}
                      disabled={pending || !canUp || isCompleted}
                      loading={activeKey === upKey}
                      onClick={() => runMove(round.raceId, "up")}
                    >
                      <ChevronUp />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Move round ${round.round} down`}
                      disabled={pending || !canDown || isCompleted}
                      loading={activeKey === downKey}
                      onClick={() => runMove(round.raceId, "down")}
                    >
                      <ChevronDown />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
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
