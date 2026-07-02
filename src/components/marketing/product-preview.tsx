import { RaceStatusBadge } from "@/components/race-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RaceStatus } from "@/generated/prisma/enums";

/** Static mock of the in-app league view — no auth or DB required. */
export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div
        aria-hidden
        className="bg-primary/20 absolute -inset-4 rounded-3xl blur-3xl sm:-inset-8"
      />
      <div className="border-border bg-card relative overflow-hidden rounded-2xl border shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-4 py-3">
          <div className="flex gap-1.5">
            <span className="bg-muted-foreground/30 size-2.5 rounded-full" />
            <span className="bg-muted-foreground/30 size-2.5 rounded-full" />
            <span className="bg-muted-foreground/30 size-2.5 rounded-full" />
          </div>
          <span className="text-muted-foreground ml-2 text-xs">
            championsofnascar.com/leagues/weeknight-warriors
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-tight sm:text-xl">
                Weeknight Warriors
              </h2>
              <p className="text-muted-foreground text-sm">
                Cup series · 12 races · 100% laps · 4 members
              </p>
            </div>
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
              Admin
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle>Standings</CardTitle>
                <CardDescription>Championship leaders</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-right">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["1", "Alex Rivera", "142"],
                      ["2", "Jordan Kim", "138"],
                      ["3", "Sam Ortiz", "131"],
                    ].map(([rank, name, pts]) => (
                      <TableRow key={rank}>
                        <TableCell className="tabular-nums">{rank}</TableCell>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {pts}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle>Schedule</CardTitle>
                <CardDescription>Upcoming rounds</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rd</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="tabular-nums">4</TableCell>
                      <TableCell className="font-medium">Daytona</TableCell>
                      <TableCell className="text-right">
                        <RaceStatusBadge status={RaceStatus.SCHEDULED} />
                      </TableCell>
                    </TableRow>
                    <TableRow className="text-muted-foreground">
                      <TableCell className="tabular-nums">5</TableCell>
                      <TableCell>Bristol</TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">
                        TBD
                      </TableCell>
                    </TableRow>
                    <TableRow className="text-muted-foreground">
                      <TableCell className="tabular-nums">6</TableCell>
                      <TableCell>Charlotte</TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">
                        TBD
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
