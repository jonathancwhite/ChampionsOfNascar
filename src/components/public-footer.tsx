import Link from "next/link";
import { Flag } from "lucide-react";

/** Footer for public/marketing pages. */
export function PublicFooter() {
  return (
    <footer className="border-border bg-muted/30 border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Flag className="text-primary size-4" />
          Champions of NASCAR
        </Link>
        <p className="text-muted-foreground text-center text-sm sm:text-left">
          Online league management for NASCAR 25. Not affiliated with iRacing
          Studios or NASCAR.
        </p>
        <div className="flex gap-4 text-sm">
          <Link
            href="/sign-in"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-primary font-medium hover:underline"
          >
            Get started
          </Link>
        </div>
      </div>
    </footer>
  );
}
