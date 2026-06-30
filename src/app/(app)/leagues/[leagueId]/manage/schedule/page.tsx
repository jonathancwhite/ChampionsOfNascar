import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LeagueRole } from "@/generated/prisma/enums";
import { requireLeagueRole } from "@/lib/auth";
import { getManageSchedule } from "@/lib/league-queries";

import { ScheduleManager } from "./schedule-manager";

export const metadata: Metadata = {
  title: "Manage schedule",
};

export const dynamic = "force-dynamic";

export default async function ManageSchedulePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;

  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    if (authz.reason === "unauthenticated") redirect("/sign-in");
    if (authz.reason === "not-member") notFound();
    redirect(`/leagues/${leagueId}`);
  }

  const schedule = await getManageSchedule(leagueId);
  if (!schedule) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-muted-foreground hover:text-foreground text-sm hover:underline"
        >
          ← {schedule.leagueName}
        </Link>
        <h1 className="font-heading mt-1 text-2xl font-bold tracking-tight">
          Manage schedule
        </h1>
        <p className="text-muted-foreground mt-1">
          Swap any round&apos;s track for another from the series pool. Dates
          and round numbers are preserved; completed races are locked.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rounds</CardTitle>
          <CardDescription>
            Replacements come from tracks not already used in this league.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleManager
            leagueId={schedule.leagueId}
            rounds={schedule.rounds}
            availableTracks={schedule.availableTracks}
            timezoneLabel={schedule.timezoneLabel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
