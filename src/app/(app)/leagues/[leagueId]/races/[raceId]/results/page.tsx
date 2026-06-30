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
import { LeagueRole, RaceStatus } from "@/generated/prisma/enums";
import { requireLeagueRole } from "@/lib/auth";
import { getRaceResultsEditor } from "@/lib/league-queries";

import { ResultsForm } from "./results-form";

export const metadata: Metadata = {
  title: "Enter results",
};

export const dynamic = "force-dynamic";

export default async function RaceResultsPage({
  params,
}: {
  params: Promise<{ leagueId: string; raceId: string }>;
}) {
  const { leagueId, raceId } = await params;

  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    if (authz.reason === "unauthenticated") redirect("/sign-in");
    if (authz.reason === "not-member") notFound();
    redirect(`/leagues/${leagueId}/races/${raceId}`);
  }

  const editor = await getRaceResultsEditor(leagueId, raceId);
  if (!editor) {
    notFound();
  }
  // No field set yet — send the admin to pick participants first.
  if (editor.rows.length === 0) {
    redirect(`/leagues/${leagueId}/races/${raceId}/manage`);
  }

  const isCompleted = editor.status === RaceStatus.COMPLETED;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/leagues/${leagueId}/races/${raceId}`}
          className="text-muted-foreground hover:text-foreground text-sm hover:underline"
        >
          ← Round {editor.round}: {editor.trackName}
        </Link>
        <h1 className="font-heading mt-1 text-2xl font-bold tracking-tight">
          {isCompleted ? "Edit results" : "Enter results"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Finishing positions must be unique (1 to the number of drivers).
          Points are computed from the league scoring scheme.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finishing order</CardTitle>
          <CardDescription>
            {isCompleted
              ? "Editing recomputes points and updates the standings."
              : "Saving awards points and marks the race completed."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResultsForm
            leagueId={editor.leagueId}
            raceId={editor.raceId}
            isCompleted={isCompleted}
            rows={editor.rows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
