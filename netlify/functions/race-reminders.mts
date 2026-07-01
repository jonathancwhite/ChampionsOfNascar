// Netlify replacement for Vercel Cron (vercel.json `crons`). Netlify Scheduled
// Functions can't invoke a Next.js route directly, so this thin function calls
// the existing, unchanged cron route with the shared bearer secret — all the
// reminder logic still lives in /api/cron/race-reminders (src/lib/cron-auth.ts
// validates the token). Netlify bundles this file automatically and reads the
// `config.schedule` export; no dependency or Vercel API involved.
//
// process.env.URL is Netlify's production site URL, injected at runtime; fall
// back to NEXT_PUBLIC_APP_URL (already a required env var) for `netlify dev`.

export default async function handler() {
  const base = process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    throw new Error(
      "URL/NEXT_PUBLIC_APP_URL and CRON_SECRET must be set for the reminder cron.",
    );
  }

  const res = await fetch(`${base}/api/cron/race-reminders`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  if (!res.ok) {
    throw new Error(`race-reminders cron returned ${res.status}`);
  }
}

// Same daily schedule as the former Vercel cron (13:00 UTC).
export const config = { schedule: "0 13 * * *" };
