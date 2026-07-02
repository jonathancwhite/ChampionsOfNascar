"use client";

import { useActionState, useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  regenerateJoinCodeAction,
  sendLeagueInvitesAction,
  type InviteState,
} from "./invite-actions";

const initialState: InviteState = {};

function CopyInviteLink({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={inviteUrl}
        onFocus={(e) => e.currentTarget.select()}
        className="font-mono text-xs"
      />
      <Button
        type="button"
        variant="outline"
        onClick={copy}
        className="shrink-0"
      >
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
}

function RegenerateCode({ leagueId }: { leagueId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={pending}
        loadingText="Regenerating…"
        onClick={() => {
          if (
            !window.confirm(
              "Regenerate the join code? The current code and any shared links stop working. Existing members keep their access.",
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const res = await regenerateJoinCodeAction(leagueId);
            if (res.error) setError(res.error);
          });
        }}
      >
        Regenerate
      </Button>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}

function InviteSummary({
  summary,
}: {
  summary: NonNullable<InviteState["summary"]>;
}) {
  const lines: string[] = [];
  if (summary.sent.length > 0) {
    lines.push(`Sent ${summary.sent.length} invite(s).`);
  }
  if (summary.alreadyInvited.length > 0) {
    lines.push(
      `${summary.alreadyInvited.length} already invited: ${summary.alreadyInvited.join(", ")}.`,
    );
  }
  if (summary.failed.length > 0) {
    lines.push(`Failed to send: ${summary.failed.join(", ")}.`);
  }
  if (summary.invalid.length > 0) {
    lines.push(`Skipped invalid: ${summary.invalid.join(", ")}.`);
  }
  if (summary.overflow) {
    lines.push("Some addresses were skipped (too many at once).");
  }

  const allGood = summary.failed.length === 0 && summary.invalid.length === 0;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        allGood
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-muted/40 text-foreground",
      )}
    >
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

export function InvitePanel({
  leagueId,
  joinCode,
  inviteUrl,
}: {
  leagueId: string;
  joinCode: string;
  inviteUrl: string;
}) {
  const [state, formAction, pending] = useActionState(
    sendLeagueInvitesAction,
    initialState,
  );
  const emailsId = useId();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-muted-foreground mb-1.5 text-sm font-medium">
          Join code
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-muted inline-flex items-center rounded-lg px-4 py-2 font-mono text-2xl font-semibold tracking-[0.3em]">
            {joinCode}
          </div>
          <RegenerateCode leagueId={leagueId} />
        </div>
      </div>

      <div>
        <p className="text-muted-foreground mb-1.5 text-sm font-medium">
          Shareable invite link
        </p>
        <CopyInviteLink inviteUrl={inviteUrl} />
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="leagueId" value={leagueId} />
        <div>
          <label
            htmlFor={emailsId}
            className="text-muted-foreground mb-1.5 block text-sm font-medium"
          >
            Invite by email
          </label>
          <textarea
            id={emailsId}
            name="emails"
            rows={2}
            placeholder="friend@example.com, another@example.com"
            className={cn(
              "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3",
            )}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Separate addresses with commas or spaces. Each gets the join link.
          </p>
        </div>

        {state.error ? (
          <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
            {state.error}
          </p>
        ) : null}
        {state.summary ? <InviteSummary summary={state.summary} /> : null}

        <Button type="submit" loading={pending} loadingText="Sending…">
          Send invites
        </Button>
      </form>
    </div>
  );
}
