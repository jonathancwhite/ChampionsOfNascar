"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeagueMember } from "@/lib/league-queries";

import {
  leaveLeagueAction,
  promoteMemberAction,
  removeMemberAction,
  transferOwnershipAction,
  type RosterActionState,
} from "./roster-actions";

/**
 * Members roster with admin controls (NASCAR-032). Admins can promote, transfer
 * ownership, and remove non-owner members; any non-owner member can leave.
 * Actions call the server actions imperatively; on success the page revalidates
 * and these props refresh. Non-admins with no self-leave option see a plain list.
 */
export function RosterManager({
  leagueId,
  members,
  viewerIsAdmin,
}: {
  leagueId: string;
  members: LeagueMember[];
  viewerIsAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<RosterActionState>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res?.error) setError(res.error);
    });
  }

  const showManage =
    viewerIsAdmin || members.some((m) => m.isYou && !m.isCreator);

  return (
    <div className="space-y-3">
      {error ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">Role</TableHead>
            {showManage ? (
              <TableHead className="text-right">Manage</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const canAdmin = viewerIsAdmin && !m.isYou && !m.isCreator;
            const canLeave = m.isYou && !m.isCreator;
            return (
              <TableRow key={m.membershipId}>
                <TableCell className="font-medium">
                  {m.name}
                  {m.isYou ? (
                    <span className="text-muted-foreground ml-2 text-xs">
                      (you)
                    </span>
                  ) : null}
                  {m.isCreator ? (
                    <span className="text-muted-foreground ml-2 text-xs">
                      · owner
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  {m.role === "ADMIN" ? "Admin" : "Member"}
                </TableCell>
                {showManage ? (
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {canAdmin && m.role !== "ADMIN" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            run(() =>
                              promoteMemberAction(leagueId, m.membershipId),
                            )
                          }
                        >
                          Make admin
                        </Button>
                      ) : null}
                      {canAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () =>
                                transferOwnershipAction(
                                  leagueId,
                                  m.membershipId,
                                ),
                              `Transfer ownership to ${m.name}? They become the league owner; you stay an admin.`,
                            )
                          }
                        >
                          Make owner
                        </Button>
                      ) : null}
                      {canAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            run(
                              () =>
                                removeMemberAction(leagueId, m.membershipId),
                              `Remove ${m.name} from the league? Their past results stay in the standings.`,
                            )
                          }
                        >
                          Remove
                        </Button>
                      ) : null}
                      {canLeave ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            run(
                              () => leaveLeagueAction(leagueId),
                              "Leave this league? You'll lose access but your past results remain.",
                            )
                          }
                        >
                          Leave league
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
