"use client";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { StandingEntry } from "@/lib/standings";

const columns: ColumnDef<StandingEntry>[] = [
  { accessorKey: "rank", header: "#", cell: (c) => c.getValue<number>() },
  { accessorKey: "driverName", header: "Driver" },
  { accessorKey: "points", header: "Points" },
  { accessorKey: "starts", header: "Starts" },
  { accessorKey: "wins", header: "Wins" },
  { accessorKey: "top5", header: "Top 5" },
  { accessorKey: "top10", header: "Top 10" },
  {
    accessorKey: "avgFinish",
    header: "Avg finish",
    cell: (c) => {
      const v = c.getValue<number>();
      return v > 0 ? v.toFixed(1) : "—";
    },
  },
];

const NUMERIC = new Set([
  "rank",
  "points",
  "starts",
  "wins",
  "top5",
  "top10",
  "avgFinish",
]);

export function StandingsTable({ entries }: { entries: StandingEntry[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "rank", desc: false },
  ]);

  // TanStack Table returns non-memoizable functions; React Compiler skips
  // memoizing this small client-only table, which is fine here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No standings yet — they appear once race results are entered.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const numeric = NUMERIC.has(header.column.id);
              const sort = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  className={cn(numeric && "text-right")}
                >
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      "hover:text-foreground inline-flex items-center gap-1",
                      numeric && "flex-row-reverse",
                    )}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {sort === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : sort === "desc" ? (
                      <ArrowDown className="size-3" />
                    ) : (
                      <ChevronsUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn(
                  NUMERIC.has(cell.column.id) && "text-right tabular-nums",
                  cell.column.id === "driverName" && "font-medium",
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
