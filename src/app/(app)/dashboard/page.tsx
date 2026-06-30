import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LocalDateTime } from "@/components/local-date-time";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getDashboardLeagues } from "@/lib/league-queries";
import { leagueStatusLabel } from "@/lib/league-status";
import { SERIES_LABELS, type SeriesValue } from "@/lib/series";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const leagues = await getDashboardLeagues(user.id, new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Your leagues
          </h1>
          <p className="text-muted-foreground mt-1">
            {leagues.length > 0
              ? "Jump back into a championship."
              : "Create a league or join one with a code to get started."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/leagues/join"
            className={buttonVariants({ variant: "outline" })}
          >
            Join league
          </Link>
          <Link href="/leagues/new" className={buttonVariants()}>
            Create league
          </Link>
        </div>
      </div>

      {leagues.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No leagues yet</CardTitle>
            <CardDescription>
              Start a new championship, or join a friend&apos;s league with
              their invite code.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/leagues/new" className={buttonVariants()}>
              Create your first league
            </Link>
            <Link
              href="/leagues/join"
              className={buttonVariants({ variant: "outline" })}
            >
              Join with a code
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/leagues/${league.id}`}
              className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
            >
              <Card className="hover:border-foreground/20 h-full transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{league.name}</CardTitle>
                    {league.role === "ADMIN" ? (
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                        Admin
                      </span>
                    ) : null}
                  </div>
                  <CardDescription>
                    {SERIES_LABELS[league.series as SeriesValue]} ·{" "}
                    {league.numberOfRaces} races · {league.memberCount}{" "}
                    {league.memberCount === 1 ? "member" : "members"} ·{" "}
                    {leagueStatusLabel(league.status)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className={cn("text-muted-foreground text-sm")}>
                    {league.nextRace ? (
                      <>
                        Next: Round {league.nextRace.round} ·{" "}
                        {league.nextRace.trackName} ·{" "}
                        <LocalDateTime value={league.nextRace.scheduledAt} />
                      </>
                    ) : (
                      "No upcoming races scheduled yet."
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
