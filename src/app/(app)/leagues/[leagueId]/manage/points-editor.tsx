"use client";

import { useActionState, useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  recomputePointsAction,
  updatePointsAction,
  type PointsState,
  type RecomputeState,
} from "./points-actions";

const initialState: PointsState = {};

const TEXTAREA_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full rounded-lg border bg-transparent px-2.5 py-1.5 font-mono text-sm transition-colors outline-none focus-visible:ring-3";

/**
 * Admin points-scheme editor (NASCAR-023). The per-position table is edited as a
 * free-text list (lazier than N inputs); bonuses are toggled via the two number
 * fields (0 = off). After a successful save, offers a league-wide recompute of
 * completed races (NASCAR-062) so existing results adopt the new scheme.
 */
export function PointsEditor({
  leagueId,
  table,
  bonuses,
  defaultTable,
  completedRaceCount,
}: {
  leagueId: string;
  table: number[];
  bonuses: { win: number; lapsLed: number };
  defaultTable: number[];
  completedRaceCount: number;
}) {
  const [state, formAction, pending] = useActionState(
    updatePointsAction,
    initialState,
  );
  const [tableText, setTableText] = useState(table.join(", "));
  const [win, setWin] = useState(String(bonuses.win));
  const [lapsLed, setLapsLed] = useState(String(bonuses.lapsLed));

  const tableId = useId();
  const winId = useId();
  const lapsId = useId();

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="leagueId" value={leagueId} />

        <div>
          <label
            htmlFor={tableId}
            className="text-muted-foreground mb-1.5 block text-sm font-medium"
          >
            Points by finishing position
          </label>
          <textarea
            id={tableId}
            name="table"
            rows={3}
            value={tableText}
            onChange={(e) => setTableText(e.target.value)}
            className={cn(TEXTAREA_CLASS)}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            One number per position: 1st, 2nd, 3rd… Positions past the list
            score 1 point. Separate with commas or spaces.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label
              htmlFor={winId}
              className="text-muted-foreground mb-1.5 block text-sm font-medium"
            >
              Win bonus
            </label>
            <Input
              id={winId}
              name="win"
              type="number"
              min={0}
              value={win}
              onChange={(e) => setWin(e.target.value)}
              className="w-28"
            />
          </div>
          <div>
            <label
              htmlFor={lapsId}
              className="text-muted-foreground mb-1.5 block text-sm font-medium"
            >
              Led-a-lap bonus
            </label>
            <Input
              id={lapsId}
              name="lapsLed"
              type="number"
              min={0}
              value={lapsLed}
              onChange={(e) => setLapsLed(e.target.value)}
              className="w-28"
            />
          </div>
        </div>

        {state.error ? (
          <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
            {state.error}
          </p>
        ) : null}
        {state.saved ? (
          <p className="border-primary/30 bg-primary/10 text-primary rounded-lg border px-3 py-2 text-sm">
            Scoring saved.
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" loading={pending} loadingText="Saving…">
            Save scoring
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setTableText(defaultTable.join(", "));
              setWin("0");
              setLapsLed("0");
            }}
          >
            Reset to default
          </Button>
        </div>
      </form>

      {state.saved && completedRaceCount > 0 ? (
        <RecomputeOffer
          leagueId={leagueId}
          completedRaceCount={completedRaceCount}
        />
      ) : null}
    </div>
  );
}

function RecomputeOffer({
  leagueId,
  completedRaceCount,
}: {
  leagueId: string;
  completedRaceCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RecomputeState | null>(null);

  return (
    <div className="border-border bg-muted/40 space-y-2 rounded-lg border px-3 py-3 text-sm">
      <p>
        {completedRaceCount}{" "}
        {completedRaceCount === 1 ? "completed race" : "completed races"} were
        scored under the old scheme. Recompute them now?
      </p>
      {result?.error ? (
        <p className="text-destructive">{result.error}</p>
      ) : null}
      {typeof result?.resultsUpdated === "number" ? (
        <p className="text-primary">
          Recomputed {result.resultsUpdated} result
          {result.resultsUpdated === 1 ? "" : "s"}.
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={pending}
        loadingText="Recomputing…"
        onClick={() =>
          startTransition(async () => {
            setResult(await recomputePointsAction(leagueId));
          })
        }
      >
        Recompute now
      </Button>
    </div>
  );
}
