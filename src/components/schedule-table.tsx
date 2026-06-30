import Link from "next/link";

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

// Shared season schedule (NASCAR-042). Read-only for everyone here; admin
// management links live on the manage view (NASCAR-041/050). Past and cancelled
// rounds are visually de-emphasized.
export function ScheduleTable({
  leagueId,
  rounds,
  now,
}: {
  leagueId: string;
  rounds: ScheduleRound[];
  now: Date;
}) {
  if (rounds.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No schedule yet — it&apos;s generated when the league is created.
      </p>
    );
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
              className={cn(isPast && "text-muted-foreground")}
            >
              <TableCell className="tabular-nums">{round.round}</TableCell>
              <TableCell>
                <Link
                  href={`/leagues/${leagueId}/races/${round.raceId}`}
                  className="hover:text-foreground font-medium hover:underline"
                >
                  {round.trackName}
                </Link>
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
