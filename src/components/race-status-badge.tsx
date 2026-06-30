import { RaceStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const STYLES: Record<RaceStatus, { label: string; className: string }> = {
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-muted text-muted-foreground",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-primary/10 text-primary",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-destructive/10 text-destructive line-through",
  },
};

export function RaceStatusBadge({ status }: { status: RaceStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}
