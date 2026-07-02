import Link from "next/link";
import { Flag } from "lucide-react";
import { Show } from "@clerk/nextjs";

import { PublicHeader } from "@/components/public-header";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="bg-muted text-muted-foreground mb-6 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
          <Flag className="text-primary size-4" />
          Built for NASCAR 25
        </div>

        <h1 className="font-heading max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Run your NASCAR career across shared leagues
        </h1>

        <p className="text-muted-foreground mt-6 max-w-xl text-lg text-balance">
          Create a league, invite your friends with a code, auto-generate the
          season schedule, and track every result in each driver&apos;s career
          profile.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Show when="signed-out">
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Get started
            </Link>
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              Sign in
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Go to dashboard
            </Link>
          </Show>
        </div>
      </main>
    </>
  );
}
