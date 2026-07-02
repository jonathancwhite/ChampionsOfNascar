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
import { getLeagueOverview, getManageSchedule } from "@/lib/league-queries";
import { leagueStatusLabel } from "@/lib/league-status";
import { buildInviteUrl } from "@/lib/invites";
import { SERIES_LABELS, type SeriesValue } from "@/lib/series";

import { InvitePanel } from "./invite-panel";
import { RosterManager } from "./roster-manager";
import { ScheduleManager } from "./manage/schedule/schedule-manager";

export const metadata: Metadata = {
  title: "League",
};

export const dynamic = "force-dynamic";

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
  const manageSchedule = isAdmin ? await getManageSchedule(leagueId) : null;
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
            {leagueStatusLabel(league.status)} · {members.length}{" "}
            {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        {isAdmin ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
              Admin
            </span>
            <Link
              href="#schedule"
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              Schedule races
            </Link>
            <Link
              href={`/leagues/${league.id}/manage`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Settings
            </Link>
          </div>
        ) : null}
      </div>

      {/* Admin-only invite controls (NASCAR-021/031): join code, shareable
          link, and email invites. */}
      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite friends</CardTitle>
            <CardDescription>
              Share the code or link, or email an invite directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvitePanel
              leagueId={league.id}
              joinCode={league.joinCode}
              inviteUrl={buildInviteUrl(league.joinCode)}
            />
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

      <Card id="schedule">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              {isAdmin ? (
                <>
                  Click a race to set its date and time. Use the arrows to
                  reorder rounds.
                </>
              ) : (
                <>
                  Randomized from the{" "}
                  {SERIES_LABELS[league.series as SeriesValue]} track pool.
                  Dates are set by an admin.
                </>
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isAdmin && manageSchedule ? (
            <ScheduleManager
              leagueId={manageSchedule.leagueId}
              rounds={manageSchedule.rounds}
              availableTracks={manageSchedule.availableTracks}
              timezoneLabel={manageSchedule.timezoneLabel}
            />
          ) : (
            <ScheduleTable leagueId={league.id} rounds={schedule} now={now} />
          )}
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
          <RosterManager
            leagueId={league.id}
            members={members}
            viewerIsAdmin={isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
