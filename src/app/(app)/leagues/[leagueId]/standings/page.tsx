import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StandingsTable } from "@/components/standings-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getLeagueStandings } from "@/lib/league-queries";

export const metadata: Metadata = {
  title: "Standings",
};

export const dynamic = "force-dynamic";

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;

  const user = await getOrCreateCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const view = await getLeagueStandings(leagueId, user.id);
  if (!view) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/leagues/${view.leagueId}`}
          className="text-muted-foreground hover:text-foreground text-sm hover:underline"
        >
          ← {view.leagueName}
        </Link>
        <h1 className="font-heading mt-1 text-2xl font-bold tracking-tight">
          Standings
        </h1>
        <p className="text-muted-foreground mt-1">
          Championship points across completed races. Human drivers only — AI
          appears in per-race results.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Championship</CardTitle>
          <CardDescription>
            Click a column to sort. Ties break on wins, then best finishes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StandingsTable entries={view.standings} />
        </CardContent>
      </Card>
    </div>
  );
}
