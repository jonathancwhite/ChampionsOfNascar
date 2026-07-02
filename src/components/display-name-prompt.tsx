"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId } from "react";

import {
  updateDisplayNameAction,
  type UpdateDisplayNameState,
} from "@/app/(app)/actions";
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
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/display-name";

const initialState: UpdateDisplayNameState = {};

export function DisplayNamePrompt() {
  const router = useRouter();
  const nameId = useId();
  const [state, formAction, pending] = useActionState(
    updateDisplayNameAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  if (state.success) {
    return null;
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Choose your display name</DialogTitle>
          <DialogDescription>
            Friends will see this on league rosters, standings, and career
            profiles. You can change it later in your account settings.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {state.error ? (
            <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
              {state.error}
            </p>
          ) : null}

          <div>
            <label
              htmlFor={nameId}
              className="mb-1.5 block text-sm font-medium"
            >
              Display name
            </label>
            <Input
              id={nameId}
              name="displayName"
              required
              autoFocus
              autoComplete="nickname"
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              placeholder="How should we show your name?"
              aria-invalid={Boolean(state.error)}
            />
          </div>

          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-start">
            <Button type="submit" loading={pending} loadingText="Saving…">
              Save and continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
