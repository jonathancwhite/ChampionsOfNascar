import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Flag,
  Mail,
  Trophy,
  Users,
} from "lucide-react";
import { Show } from "@clerk/nextjs";

import { ProductPreview } from "@/components/marketing/product-preview";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Champions of NASCAR — Online league management for NASCAR 25",
  description:
    "Create private leagues, auto-generate schedules from the NASCAR 25 track pool, schedule races, record results, and track every driver's career.",
};

const FEATURES = [
  {
    icon: Users,
    title: "Private leagues with friends",
    description:
      "Create a league in minutes, share a join code or send email invites, and manage your roster from one place.",
  },
  {
    icon: Flag,
    title: "NASCAR 25 track pool",
    description:
      "Season schedules are randomized from Cup, Xfinity, or Truck tracks — no repeats, configurable race count and lap length.",
  },
  {
    icon: CalendarDays,
    title: "Schedule races your way",
    description:
      "Admins set date and time per round, swap tracks, reorder the calendar, and members get notified by email.",
  },
  {
    icon: BarChart3,
    title: "Live championship standings",
    description:
      "Points roll up automatically after every race. Customize scoring or stick with the default 40-down format.",
  },
  {
    icon: Trophy,
    title: "Career profiles",
    description:
      "Every driver gets a cross-league career page — wins, top fives, average finish, and series breakdowns.",
  },
  {
    icon: Mail,
    title: "Race reminders",
    description:
      "Members receive a heads-up when a race is scheduled and again five days before green flag.",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Create your account",
    description: "Sign up free, pick a display name, and you're ready to race.",
  },
  {
    step: "2",
    title: "Start or join a league",
    description:
      "Spin up a new championship or enter a friend's join code — Cup, Xfinity, or Truck.",
  },
  {
    step: "3",
    title: "Run the season",
    description:
      "Schedule races, enter results after each night, and watch the standings update in real time.",
  },
] as const;

function HeroCtas() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      <Show when="signed-out">
        <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>
          Start your league — it&apos;s free
        </Link>
        <Link
          href="/sign-in"
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
        >
          Sign in
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
          Go to dashboard
        </Link>
        <Link
          href="/leagues/new"
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
        >
          Create a league
        </Link>
      </Show>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <PublicHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div
            aria-hidden
            className="from-primary/10 via-background to-background absolute inset-0 bg-gradient-to-b"
          />
          <div className="relative mx-auto max-w-6xl text-center">
            <div className="bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
              <Flag className="size-4" />
              Built for NASCAR 25
            </div>

            <h1 className="font-heading mx-auto max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Your friends&apos; championship,{" "}
              <span className="text-primary">organized</span>
            </h1>

            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-balance sm:text-xl">
              Champions of NASCAR is the league hub for online NASCAR 25 seasons
              — schedules, standings, results, and career stats in one place so
              you can focus on racing.
            </p>

            <div className="mt-10">
              <HeroCtas />
            </div>

            <p className="text-muted-foreground mt-6 text-sm">
              Free for private leagues · No game API required · Manual results
              entry
            </p>
          </div>

          <div className="relative mx-auto mt-16 max-w-6xl px-2 sm:mt-20">
            <ProductPreview />
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="border-border bg-muted/30 border-y px-6 py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Everything your league needs
              </h2>
              <p className="text-muted-foreground mt-4 text-lg text-balance">
                From the first invite to the final trophy — built around how
                friend groups actually run NASCAR 25 seasons.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="bg-card/80">
                  <CardHeader>
                    <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Up and running in three steps
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">
                No spreadsheets. No group-chat chaos. Just a shared home for
                your season.
              </p>
            </div>

            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map(({ step, title, description }) => (
                <li key={step} className="relative text-center md:text-left">
                  <span className="bg-primary text-primary-foreground mb-4 inline-flex size-10 items-center justify-center rounded-full text-sm font-bold">
                    {step}
                  </span>
                  <h3 className="font-heading text-xl font-semibold">
                    {title}
                  </h3>
                  <p className="text-muted-foreground mt-2 leading-relaxed">
                    {description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-20 sm:pb-24">
          <div className="from-primary to-primary/80 mx-auto max-w-4xl rounded-2xl bg-gradient-to-br px-8 py-14 text-center text-white shadow-xl sm:px-12">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Ready to crown a champion?
            </h2>
            <p className="mt-4 text-lg text-balance text-white/85">
              Gather your crew, generate the schedule, and let the points tell
              the story.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Show when="signed-out">
                <Link
                  href="/sign-up"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-background text-foreground hover:bg-background/90",
                  )}
                >
                  Create free account
                </Link>
                <Link
                  href="/sign-in"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white",
                  )}
                >
                  Sign in
                </Link>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/leagues/new"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-background text-foreground hover:bg-background/90",
                  )}
                >
                  Create a league
                </Link>
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white",
                  )}
                >
                  Go to dashboard
                </Link>
              </Show>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
