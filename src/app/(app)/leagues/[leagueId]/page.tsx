import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ScheduleTable } from "@/components/schedule-table";
import { buttonVariants } from "@/components/ui/button";
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
import { getLeagueOverview } from "@/lib/league-queries";
import { SERIES_LABELS, type SeriesValue } from "@/lib/series";

export const metadata: Metadata = {
  title: "League",
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  setup: "Setup",
  active: "Active",
  finished: "Finished",
};

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;

  const user = await getOrCreateCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Membership-scoped: a non-member gets a 404, never a peek at the league.
  const overview = await getLeagueOverview(leagueId, user.id);
  if (!overview) {
    notFound();
  }

  const { league, isAdmin, schedule, members, standings } = overview;
  const now = new Date();
  const topStandings = standings.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {league.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {SERIES_LABELS[league.series as SeriesValue]} series ·{" "}
            {league.numberOfRaces} races · {league.lapsPercent}% laps ·{" "}
            {STATUS_LABELS[league.status] ?? league.status} · {members.length}{" "}
            {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        {isAdmin ? (
          <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
            Admin
          </span>
        ) : null}
      </div>

      {/* Join code is an admin-only control (NASCAR-021). Member-facing invites
          arrive with NASCAR-031. */}
      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite friends</CardTitle>
            <CardDescription>
              Share this join code so friends can join your league.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted inline-flex items-center rounded-lg px-4 py-2 font-mono text-2xl font-semibold tracking-[0.3em]">
              {league.joinCode}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Standings</CardTitle>
            <CardDescription>Championship leaders.</CardDescription>
          </div>
          <Link
            href={`/leagues/${league.id}/standings`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View full standings
          </Link>
        </CardHeader>
        <CardContent>
          {topStandings.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No standings yet — they appear once race results are entered.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topStandings.map((entry) => (
                  <TableRow key={entry.membershipId}>
                    <TableCell className="tabular-nums">{entry.rank}</TableCell>
                    <TableCell className="font-medium">
                      {entry.driverName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.points}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>
            Randomized from the {SERIES_LABELS[league.series as SeriesValue]}{" "}
            track pool. Dates are set by an admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleTable leagueId={league.id} rounds={schedule} now={now} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "player" : "players"} in
            this league.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.membershipId}>
                  <TableCell className="font-medium">
                    {member.name}
                    {member.isYou ? (
                      <span className="text-muted-foreground ml-2 text-xs">
                        (you)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role === "ADMIN" ? "Admin" : "Member"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
