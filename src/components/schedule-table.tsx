"use client";

import { useRouter } from "next/navigation";

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
import { RaceStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import type { ScheduleRound } from "@/lib/league-queries";

const TRACK_TYPE_LABELS: Record<string, string> = {
  superspeedway: "Superspeedway",
  intermediate: "Intermediate",
  short: "Short track",
  roadCourse: "Road course",
  dirt: "Dirt",
};

const CLICKABLE_ROW =
  "cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// Shared season schedule (NASCAR-042). Row click opens the race detail page
// (NASCAR-085). Past and cancelled rounds are visually de-emphasized.
export function ScheduleTable({
  leagueId,
  rounds,
  now,
}: {
  leagueId: string;
  rounds: ScheduleRound[];
  now: Date;
}) {
  const router = useRouter();

  if (rounds.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No schedule yet — it&apos;s generated when the league is created.
      </p>
    );
  }

  function goToRace(raceId: string) {
    router.push(`/leagues/${leagueId}/races/${raceId}`);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Round</TableHead>
          <TableHead>Track</TableHead>
          <TableHead>Date &amp; time</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rounds.map((round) => {
          const isPast =
            round.status === RaceStatus.COMPLETED ||
            round.status === RaceStatus.CANCELLED ||
            (round.scheduledAt !== null && round.scheduledAt < now);

          return (
            <TableRow
              key={round.raceId}
              className={cn(CLICKABLE_ROW, isPast && "text-muted-foreground")}
              tabIndex={0}
              role="link"
              aria-label={`View round ${round.round}, ${round.trackName}`}
              onClick={() => goToRace(round.raceId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToRace(round.raceId);
                }
              }}
            >
              <TableCell className="tabular-nums">{round.round}</TableCell>
              <TableCell>
                <span className="font-medium">{round.trackName}</span>
                {round.trackType ? (
                  <span className="text-muted-foreground ml-2 text-xs">
                    {TRACK_TYPE_LABELS[round.trackType] ?? round.trackType}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>
                <LocalDateTime value={round.scheduledAt} />
              </TableCell>
              <TableCell className="text-right">
                <RaceStatusBadge status={round.status} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
