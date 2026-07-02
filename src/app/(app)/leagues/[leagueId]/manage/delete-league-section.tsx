"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isDeleteConfirmationValid } from "@/lib/league-delete";

import { deleteLeagueAction } from "./actions";

/**
 * Danger zone for permanent league deletion (NASCAR-087). Admin must type the
 * league name to confirm; on success the server redirects to the dashboard.
 */
export function DeleteLeagueSection({
  leagueId,
  leagueName,
}: {
  leagueId: string;
  leagueName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canDelete = isDeleteConfirmationValid(confirmName, leagueName);

  function resetDialog() {
    setConfirmName("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetDialog();
  }

  function handleDelete() {
    if (!canDelete) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteLeagueAction(leagueId, confirmName);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Permanently delete this league, its schedule, memberships, and all
          race results. This cannot be undone.
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setOpen(true)}
        >
          Delete league
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete league</DialogTitle>
            <DialogDescription>
              This removes <strong>{leagueName}</strong> for every member. Type
              the league name below to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {error ? (
              <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
                {error}
              </p>
            ) : null}

            <Input
              value={confirmName}
              disabled={pending}
              placeholder={leagueName}
              aria-label="Type league name to confirm deletion"
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={pending}
              loadingText="Deleting…"
              disabled={pending || !canDelete}
              onClick={handleDelete}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
