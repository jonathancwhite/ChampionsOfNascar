import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Your leagues will appear here.
          </p>
        </div>
        <Link href="/leagues/new" className={buttonVariants()}>
          Create league
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No leagues yet</CardTitle>
          <CardDescription>
            Create a league or join one with a code to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/leagues/new"
            className={buttonVariants({ variant: "outline" })}
          >
            Create your first league
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
