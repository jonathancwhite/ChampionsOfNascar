"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResultEditorRow } from "@/lib/league-queries";

import { saveResultsAction } from "./actions";

type Row = {
  participantId: string;
  driverName: string;
  isAi: boolean;
  finishPos: string;
  startPos: string;
  lapsLed: string;
  dnf: boolean;
};

function toRow(r: ResultEditorRow): Row {
  return {
    participantId: r.participantId,
    driverName: r.driverName,
    isAi: r.isAi,
    finishPos: r.finishPos == null ? "" : String(r.finishPos),
    startPos: r.startPos == null ? "" : String(r.startPos),
    lapsLed: String(r.lapsLed ?? 0),
    dnf: r.dnf,
  };
}

/**
 * Results entry/edit grid (NASCAR-061 / NASCAR-062). One row per participant:
 * finish (required), optional start and laps led, and a DNF flag. Saving
 * computes points from the league scheme and completes the race; the same form
 * edits a completed race's results. Full validation is server-side.
 */
export function ResultsForm({
  leagueId,
  raceId,
  isCompleted,
  rows: initialRows,
}: {
  leagueId: string;
  raceId: string;
  isCompleted: boolean;
  rows: ResultEditorRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>(() => initialRows.map(toRow));

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.participantId === id ? { ...r, ...patch } : r)),
    );
  }

  function save() {
    setError(null);
    const entries = rows.map((r) => ({
      participantId: r.participantId,
      finishPos: Number(r.finishPos),
      startPos: r.startPos.trim() === "" ? null : Number(r.startPos),
      lapsLed: r.lapsLed.trim() === "" ? 0 : Number(r.lapsLed),
      dnf: r.dnf,
    }));

    if (
      entries.some((e) => !Number.isInteger(e.finishPos) || e.finishPos < 1)
    ) {
      setError("Every driver needs a finishing position (1 and up).");
      return;
    }

    startTransition(async () => {
      const res = await saveResultsAction(leagueId, raceId, entries);
      if (res.error) {
        setError(res.error);
      } else {
        router.push(`/leagues/${leagueId}/races/${raceId}`);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No participants yet. Add the race field first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Driver</TableHead>
            <TableHead className="w-20">Finish</TableHead>
            <TableHead className="w-20">Start</TableHead>
            <TableHead className="w-24">Laps led</TableHead>
            <TableHead className="w-16 text-center">DNF</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.participantId}>
              <TableCell className="font-medium">
                {r.driverName}
                {r.isAi ? (
                  <span className="text-muted-foreground ml-2 text-xs">AI</span>
                ) : null}
              </TableCell>
              <TableCell>
                <Input
                  inputMode="numeric"
                  value={r.finishPos}
                  onChange={(e) =>
                    update(r.participantId, { finishPos: e.target.value })
                  }
                  className="w-16"
                />
              </TableCell>
              <TableCell>
                <Input
                  inputMode="numeric"
                  value={r.startPos}
                  onChange={(e) =>
                    update(r.participantId, { startPos: e.target.value })
                  }
                  className="w-16"
                />
              </TableCell>
              <TableCell>
                <Input
                  inputMode="numeric"
                  value={r.lapsLed}
                  onChange={(e) =>
                    update(r.participantId, { lapsLed: e.target.value })
                  }
                  className="w-20"
                />
              </TableCell>
              <TableCell className="text-center">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={r.dnf}
                  onChange={(e) =>
                    update(r.participantId, { dnf: e.target.checked })
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {error ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <Button type="button" onClick={save} disabled={pending}>
        {pending
          ? "Saving…"
          : isCompleted
            ? "Save changes"
            : "Save results & complete race"}
      </Button>
    </div>
  );
}
