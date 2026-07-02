import Link from "next/link";
import { Flag } from "lucide-react";
import { Show } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
] as const;

/** Header for public/marketing pages (NASCAR-090). */
export function PublicHeader() {
  return (
    <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold"
        >
          <Flag className="text-primary size-5" />
          <span className="hidden sm:inline">Champions of NASCAR</span>
          <span className="sm:hidden">CoN</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Sign in
            </Link>
            <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
              Get started
            </Link>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              Dashboard
            </Link>
          </Show>
        </div>
      </div>
    </header>
  );
}
