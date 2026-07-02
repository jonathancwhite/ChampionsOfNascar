"use client";

import Link from "next/link";
import { useActionState, useId } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { joinLeagueAction, type JoinLeagueState } from "./actions";

const initialState: JoinLeagueState = {};

export function JoinForm({ defaultCode = "" }: { defaultCode?: string }) {
  const [state, formAction, pending] = useActionState(
    joinLeagueAction,
    initialState,
  );
  const codeId = useId();

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor={codeId} className="mb-1.5 block text-sm font-medium">
          Join code
        </label>
        <Input
          id={codeId}
          name="code"
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          defaultValue={defaultCode}
          placeholder="ABCD2345"
          className="font-mono tracking-[0.2em] uppercase"
          aria-invalid={Boolean(state.error)}
        />
        <p className="text-muted-foreground mt-1 text-sm">
          Ask the league admin for their 8-character code.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={pending} loadingText="Joining…">
          Join league
        </Button>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "ghost" })}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
