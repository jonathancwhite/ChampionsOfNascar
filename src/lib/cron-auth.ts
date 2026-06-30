// Cron endpoint authorization (NASCAR-052). Pure, so the bearer check unit-tests
// without a request. Vercel Cron calls the route with
// `Authorization: Bearer ${CRON_SECRET}`.

/** True only for a header that exactly matches `Bearer <secret>` (non-empty). */
export function isAuthorizedCron(
  authHeader: string | null,
  secret: string,
): boolean {
  if (!secret) return false; // a missing secret must never authorize
  return authHeader === `Bearer ${secret}`;
}
