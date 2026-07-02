import Link from "next/link";
import { Flag } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

// Shared shell for authenticated pages. Route protection is enforced by
// src/middleware.ts (NASCAR-010); reaching this layout implies a signed-in user.
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Flag className="size-5" />
            Champions of NASCAR
          </Link>
          {/* Sign-out lives in the UserButton menu; the post-sign-out
              destination is set via afterSignOutUrl on <ClerkProvider>. */}
          <nav className="ml-auto flex items-center gap-4">
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              My career
            </Link>
            <UserButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
