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
import { getRaceParticipantsEditor } from "@/lib/league-queries";

import { ParticipantsManager } from "./participants-manager";

export const metadata: Metadata = {
  title: "Manage participants",
};

export const dynamic = "force-dynamic";

export default async function ManageParticipantsPage({
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

  const editor = await getRaceParticipantsEditor(leagueId, raceId);
  if (!editor) {
    notFound();
  }
  // Participants are locked once the race is completed; edits go through results.
  if (editor.status === RaceStatus.COMPLETED) {
    redirect(`/leagues/${leagueId}/races/${raceId}/results`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/leagues/${leagueId}/races/${raceId}`}
          className="text-muted-foreground hover:text-foreground text-sm hover:underline"
        >
          ← Round {editor.round}: {editor.trackName}
        </Link>
        <h1 className="font-heading mt-1 text-2xl font-bold tracking-tight">
          Participants
        </h1>
        <p className="text-muted-foreground mt-1">
          Choose who raced — joined members and AI drivers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Race field</CardTitle>
          <CardDescription>
            AI drivers appear in per-race results but not the championship
            standings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ParticipantsManager
            leagueId={editor.leagueId}
            raceId={editor.raceId}
            members={editor.members}
            aiEntries={editor.aiEntries}
          />
        </CardContent>
      </Card>
    </div>
  );
}
