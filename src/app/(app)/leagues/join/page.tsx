import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Join a league",
};

export default async function JoinLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // `?code=` lets invite links (NASCAR-031) pre-fill the form.
  const { code } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Join a league
        </h1>
        <p className="text-muted-foreground mt-1">
          Enter a friend&apos;s join code to compete in their championship.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Have a code?</CardTitle>
          <CardDescription>
            Codes aren&apos;t case-sensitive — paste or type it in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinForm defaultCode={code ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
