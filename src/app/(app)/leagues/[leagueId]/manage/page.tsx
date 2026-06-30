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
import { getLeagueSettings, getPointsSettings } from "@/lib/league-queries";
import { DEFAULT_SCHEME } from "@/lib/points";

import { LeagueSettingsForm } from "./league-settings-form";
import { PointsEditor } from "./points-editor";

export const metadata: Metadata = {
  title: "League settings",
};

export const dynamic = "force-dynamic";

export default async function ManageLeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;

  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    if (authz.reason === "unauthenticated") redirect("/sign-in");
    // Hide the league from non-members; send non-admin members back to the
    // overview they're allowed to see (403-equivalent, no peek for outsiders).
    if (authz.reason === "not-member") notFound();
    redirect(`/leagues/${leagueId}`);
  }

  const settings = await getLeagueSettings(leagueId);
  if (!settings) {
    notFound();
  }

  const points = await getPointsSettings(leagueId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-muted-foreground hover:text-foreground text-sm hover:underline"
        >
          ← {settings.name}
        </Link>
        <h1 className="font-heading mt-1 text-2xl font-bold tracking-tight">
          League settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Adjust your league&apos;s name, race length, reminders, and status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Name, race length, reminders, and lifecycle status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeagueSettingsForm settings={settings} />
        </CardContent>
      </Card>

      {points ? (
        <Card>
          <CardHeader>
            <CardTitle>Scoring</CardTitle>
            <CardDescription>
              Customize championship points. Default is 40-down (1st=40, 2nd=35,
              3rd=34, −1 per position).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PointsEditor
              leagueId={leagueId}
              table={points.table}
              bonuses={points.bonuses}
              defaultTable={DEFAULT_SCHEME.table}
              completedRaceCount={points.completedRaceCount}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
