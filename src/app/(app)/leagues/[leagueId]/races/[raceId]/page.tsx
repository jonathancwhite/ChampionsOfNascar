import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LocalDateTime } from "@/components/local-date-time";
import { RaceStatusBadge } from "@/components/race-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getRaceDetail } from "@/lib/league-queries";

export const metadata: Metadata = {
  title: "Race",
};

export const dynamic = "force-dynamic";

export default async function RacePage({
  params,
}: {
  params: Promise<{ leagueId: string; raceId: string }>;
}) {
  const { leagueId, raceId } = await params;

  const user = await getOrCreateCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const race = await getRaceDetail(leagueId, raceId, user.id);
  if (!race) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/leagues/${race.leagueId}`}
          className="text-muted-foreground hover:text-foreground text-sm hover:underline"
        >
          ← {race.leagueName}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Round {race.round}: {race.trackName}
          </h1>
          <RaceStatusBadge status={race.status} />
        </div>
        <p className="text-muted-foreground mt-1">
          <LocalDateTime value={race.scheduledAt} />
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {race.results.length === 0
              ? "No participants yet."
              : "Finishing order. AI drivers are shown here but excluded from championship standings."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {race.results.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Participants and results are added by an admin once the race is
              run.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Pos</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Start</TableHead>
                  <TableHead className="text-right">Laps led</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {race.results.map((row) => (
                  <TableRow key={row.participantId}>
                    <TableCell className="tabular-nums">
                      {row.dnf ? "DNF" : (row.finishPos ?? "—")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.driverName}
                      {row.isAi ? (
                        <span className="text-muted-foreground ml-2 text-xs">
                          AI
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.startPos ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.lapsLed}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.points}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
