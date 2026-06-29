import Link from "next/link";
import { Flag } from "lucide-react";

// Shared shell for authenticated pages. Auth/route protection is added in
// NASCAR-010 (Clerk); for now this is an empty signed-in layout.
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
            NASCAR 25 Championship
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
