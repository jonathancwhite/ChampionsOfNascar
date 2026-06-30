import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trackCountsBySeries } from "@/lib/leagues";

import { LeagueForm } from "./league-form";

export const metadata: Metadata = {
  title: "Create league",
};

// Reads live track counts (DB) and is auth-gated, so it must render per-request
// rather than being prerendered at build time.
export const dynamic = "force-dynamic";

export default async function NewLeaguePage() {
  const trackCounts = await trackCountsBySeries();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Create a league
        </h1>
        <p className="text-muted-foreground mt-1">
          Set up your season. You&apos;ll get a join code to share with friends.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>League settings</CardTitle>
          <CardDescription>
            The schedule is randomized from the NASCAR 25 track pool for your
            series.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeagueForm trackCounts={trackCounts} />
        </CardContent>
      </Card>
    </div>
  );
}
