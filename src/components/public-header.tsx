import Link from "next/link";
import { Flag } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

/** Minimal header for public/marketing pages (NASCAR-090). */
export function PublicHeader() {
  return (
    <header className="border-border bg-background border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Flag className="text-primary size-5" />
          Champions of NASCAR
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
