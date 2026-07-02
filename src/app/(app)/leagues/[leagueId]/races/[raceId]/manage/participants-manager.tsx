"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ParticipantsEditorMember } from "@/lib/league-queries";
import { cn } from "@/lib/utils";

import { setParticipantsAction } from "./actions";

type AiRow = { name: string; carNumber: string };

/**
 * Race participant editor (NASCAR-060). Pick which current members raced and add
 * AI drivers (name + optional car number). Saving replaces the participant list;
 * once saved, the admin proceeds to enter results.
 */
export function ParticipantsManager({
  leagueId,
  raceId,
  members,
  aiEntries,
}: {
  leagueId: string;
  raceId: string;
  members: ParticipantsEditorMember[];
  aiEntries: { name: string; carNumber: number | null }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(members.filter((m) => m.selected).map((m) => m.membershipId)),
  );
  const [ai, setAi] = useState<AiRow[]>(() =>
    aiEntries.map((a) => ({
      name: a.name,
      carNumber: a.carNumber == null ? "" : String(a.carNumber),
    })),
  );

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    setError(null);
    setSaved(false);
    const input = {
      humans: [...selected],
      aiEntries: ai
        .map((a) => ({
          name: a.name.trim(),
          carNumber: a.carNumber.trim() === "" ? null : Number(a.carNumber),
        }))
        .filter((a) => a.name.length > 0),
    };
    startTransition(async () => {
      const res = await setParticipantsAction(leagueId, raceId, input);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-sm font-medium">Members</h2>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No members yet — invite friends from the league page.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {members.map((m) => (
              <li key={m.membershipId}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={selected.has(m.membershipId)}
                    onChange={() => toggleMember(m.membershipId)}
                  />
                  {m.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">AI drivers</h2>
        <div className="space-y-2">
          {ai.map((row, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="AI driver name"
                value={row.name}
                onChange={(e) =>
                  setAi((prev) =>
                    prev.map((r, j) =>
                      j === i ? { ...r, name: e.target.value } : r,
                    ),
                  )
                }
              />
              <Input
                placeholder="Car #"
                inputMode="numeric"
                value={row.carNumber}
                onChange={(e) =>
                  setAi((prev) =>
                    prev.map((r, j) =>
                      j === i ? { ...r, carNumber: e.target.value } : r,
                    ),
                  )
                }
                className="w-24 shrink-0"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => setAi((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setAi((prev) => [...prev, { name: "", carNumber: "" }])
            }
          >
            Add AI driver
          </Button>
        </div>
      </div>

      {error ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      {saved ? (
        <div
          className={cn(
            "border-primary/30 bg-primary/10 text-primary flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm",
          )}
        >
          <span>Participants saved.</span>
          <Link
            href={`/leagues/${leagueId}/races/${raceId}/results`}
            className="font-medium underline"
          >
            Enter results →
          </Link>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={save}
        loading={pending}
        loadingText="Saving…"
      >
        Save participants
      </Button>
    </div>
  );
}
