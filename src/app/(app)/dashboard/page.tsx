import type { Metadata } from "next";

import {
  Card,
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
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Your leagues will appear here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No leagues yet</CardTitle>
          <CardDescription>
            Create a league or join one with a code to get started.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
