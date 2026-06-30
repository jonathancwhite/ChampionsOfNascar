import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

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
import { prisma } from "@/lib/db";
import { SERIES_LABELS, type SeriesValue } from "@/lib/series";

export const metadata: Metadata = {
  title: "League",
};

// Auth-gated and DB-backed: render per-request, never prerender.
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

  // Scope to leagues the user belongs to — a non-member gets a 404, not a peek.
  const league = await prisma.league.findFirst({
    where: { id: leagueId, memberships: { some: { userId: user.id } } },
    include: {
      _count: { select: { memberships: true } },
      races: {
        orderBy: { round: "asc" },
        select: { id: true, round: true, track: { select: { name: true } } },
      },
    },
  });

  if (!league) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {league.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          {SERIES_LABELS[league.series as SeriesValue]} series ·{" "}
          {league.numberOfRaces} races · {league.lapsPercent}% laps ·{" "}
          {league._count.memberships}{" "}
          {league._count.memberships === 1 ? "member" : "members"}
        </p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>
            Randomized from the {SERIES_LABELS[league.series as SeriesValue]}{" "}
            track pool. Race dates are set later by an admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Round</TableHead>
                <TableHead>Track</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {league.races.map((race) => (
                <TableRow key={race.id}>
                  <TableCell className="text-muted-foreground">
                    {race.round}
                  </TableCell>
                  <TableCell className="font-medium">
                    {race.track.name}
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
