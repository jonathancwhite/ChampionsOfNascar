# Deployment (Vercel) — NASCAR-080

Runbook for taking the app live on Vercel with a Postgres database, production
Clerk + Resend, and the reminder cron. Steps marked **(manual)** are done in a
dashboard and can't be scripted from the repo.

## Prerequisites

- The GitHub repo connected to a Vercel account.
- A serverless Postgres (Neon, Supabase, or Vercel Postgres) — you need a
  **pooled** connection string for the app and a **direct** (unpooled) one for
  migrations.
- A Clerk production instance and a Resend account with a domain to verify.

## 1. Create the Vercel project (manual)

Import the GitHub repo in Vercel. Framework preset: **Next.js**. The build
command is pinned in `vercel.json`:

```
prisma migrate deploy && next build
```

`postinstall` runs `prisma generate` during install, then `migrate deploy`
applies any pending migrations before the build. (`next build` alone runs in CI
without a database because the app's pages are `force-dynamic`.)

> **Preview deploys:** the build command runs on previews too, so scope the
> database env vars per-environment — point **Preview** at a separate DB or a
> Neon branch so preview migrations never touch production data.

## 2. Environment variables (manual)

Set these for **Production** and **Preview** (Vercel → Settings → Environment
Variables). They mirror `src/lib/env.ts`.

| Variable                            | Notes                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                      | **Pooled** Postgres URL (PgBouncer/Neon pooler) — used by the app at runtime. |
| `DIRECT_URL`                        | **Unpooled** Postgres URL — used by `prisma migrate deploy`.                  |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk **production** publishable key.                                         |
| `CLERK_SECRET_KEY`                  | Clerk production secret.                                                      |
| `CLERK_WEBHOOK_SECRET`              | Signing secret of the production webhook (step 4).                            |
| `RESEND_API_KEY`                    | Resend API key.                                                               |
| `EMAIL_FROM`                        | Sender on a **verified** domain, e.g. `NASCAR 25 <noreply@yourdomain.com>`.   |
| `EMAIL_UNSUBSCRIBE_SECRET`          | High-entropy random string (`openssl rand -hex 32`).                          |
| `CRON_SECRET`                       | High-entropy random string — Vercel Cron sends it as a Bearer token (step 5). |
| `NEXT_PUBLIC_APP_URL`               | The production origin, e.g. `https://your-app.vercel.app`.                    |

## 3. Database & migrations

- Runtime uses the pooled `DATABASE_URL` via the Prisma driver adapter
  (`src/lib/db.ts`); migrations use `DIRECT_URL` (`prisma.config.ts`).
- Migrations apply automatically on deploy through the build command above. To
  run them by hand: `DIRECT_URL=... npm run db:deploy`.

## 4. Clerk production (manual)

1. Create/switch to the Clerk **production** instance; copy its publishable and
   secret keys into the env vars.
2. Add a webhook endpoint pointing at `https://<app>/api/webhooks/clerk`,
   subscribed to `user.created`, `user.updated`, `user.deleted`.
3. Copy the endpoint's **Signing Secret** into `CLERK_WEBHOOK_SECRET`.

## 5. Cron

- `vercel.json` registers the daily job (`0 13 * * *` →
  `/api/cron/race-reminders`); it appears under **Settings → Cron Jobs** after
  deploy.
- When `CRON_SECRET` is set, Vercel Cron calls the route with
  `Authorization: Bearer $CRON_SECRET`; the route rejects anything else
  (`src/lib/cron-auth.ts`).

## 6. Resend (manual)

Verify your sending domain in Resend and publish the **SPF** and **DKIM** DNS
records it provides, then set `EMAIL_FROM` to an address on that domain. See the
**Email** section of `README.md`.

## 7. Observability (optional, manual)

Error tracking is pre-wired behind `captureError` in `src/lib/logger.ts`. To
enable Sentry: `npm i @sentry/nextjs`, run `npx @sentry/wizard@latest -i nextjs`,
set `SENTRY_DSN`, and call `Sentry.captureException` inside `captureError`. The
health endpoint (`/api/health`) and structured logs work without it.

## 8. Verification checklist

- [ ] Production and a preview deploy both succeed.
- [ ] `GET /api/health` returns `{"status":"ok","db":"up", ...}`.
- [ ] Sign up → a `User` row is created (Clerk webhook).
- [ ] Create a league, join with the code, set a race date → "race scheduled"
      email arrives; re-saving the same date sends nothing.
- [ ] Trigger the cron manually (command below) and confirm at-most-once
      delivery — run it twice; `EmailLog` has one `RACE_REMINDER` row per
      (race, user).
- [ ] `/api/health` now reports the `lastCronRun`.

Manual cron trigger:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/race-reminders
```

## Deploying on Netlify (alternative)

The app also runs on Netlify — only two things differ from the Vercel steps
above; everything else (env vars in steps 2–7, DB, Clerk, Resend) is identical.

1. **Build + runtime** — `netlify.toml` pins `next build` and `publish = ".next"`
   (the runtime rejects a repo-root publish dir). Netlify auto-installs its
   Next.js runtime (`@netlify/plugin-nextjs`) on detection. Unlike Vercel, the
   build does **not** run `prisma migrate deploy` — apply migrations out-of-band
   (`DIRECT_URL=... npm run db:deploy`, see step 3) before the app relies on new
   schema.
2. **Cron** — Netlify has no `vercel.json`-style cron, so
   `netlify/functions/race-reminders.mts` is a Scheduled Function that calls the
   **unchanged** `/api/cron/race-reminders` route with `Authorization: Bearer
$CRON_SECRET` on the same `0 13 * * *` schedule. It reads the site URL from
   Netlify's auto-injected `URL` (falling back to `NEXT_PUBLIC_APP_URL`), so no
   extra env var is needed beyond the ones in step 2.
