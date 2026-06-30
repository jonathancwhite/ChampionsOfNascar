import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Authenticated areas of the app. Everything else — the landing page,
// /sign-in, /sign-up, and the Clerk webhook (/api/webhooks/clerk) — stays
// public. Authorization *within* a league (admin vs member) is layered on top
// per-route later (NASCAR-022/060); this only gates authentication.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/leagues(.*)",
  "/profile(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // Redirects unauthenticated users to the sign-in page
    // (NEXT_PUBLIC_CLERK_SIGN_IN_URL).
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on everything except Next internals and static files, unless they
    // appear as a search param.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
