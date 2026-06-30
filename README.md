# NASCAR 25 Championship Tracker

A web app for running an online NASCAR career across shared leagues, built around the settings of the **NASCAR 25** game (iRacing Studios).

League creators configure a league (series, race count, % of laps, name), friends join with a unique code, the season schedule is auto-generated from the NASCAR 25 track pool, admins set race dates (which notify members by email) and record results that roll up into each player's career profile.

> **Note:** NASCAR 25 exposes no public API or data export, so all participants and results are entered manually by the league admin.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Clerk (auth)
- Resend (email) + Vercel Cron (reminders)
- Tailwind CSS + shadcn/ui
- Hosted on Vercel

## Local setup

```bash
npm install
cp .env.example .env   # then fill in real values (see below)
npm run dev
```

The app validates its environment at startup (`src/lib/env.ts`, run from
`src/instrumentation.ts`). A missing or malformed required variable **stops the
server from booting** with an error naming the offending var — misconfiguration
fails fast instead of surfacing as a vague `undefined` at request time.

## Environment variables

All variables live in `.env` (gitignored; never commit real secrets). See
[`.env.example`](./.env.example) for the canonical list and inline notes.
`NEXT_PUBLIC_*` vars are exposed to the browser; everything else is server-only.

| Variable                                                                                | Required    | Where to get it                                                                                           |
| --------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                          | yes         | Postgres provider (Neon/Supabase) → pooled connection string.                                             |
| `DIRECT_URL`                                                                            | if pooled   | Same provider → direct/unpooled string. Only needed when `DATABASE_URL` is a pooler; used for migrations. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                                                     | yes         | Clerk Dashboard → API Keys.                                                                               |
| `CLERK_SECRET_KEY`                                                                      | yes         | Clerk Dashboard → API Keys.                                                                               |
| `CLERK_WEBHOOK_SECRET`                                                                  | yes         | Clerk Dashboard → Webhooks → endpoint → Signing Secret.                                                   |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `..._SIGN_UP_URL`                                     | recommended | Set to `/sign-in` and `/sign-up` to keep auth in-app instead of Clerk's hosted Account Portal.            |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` / `..._SIGN_UP_FALLBACK_REDIRECT_URL` | recommended | Where to land after auth, e.g. `/dashboard`.                                                              |
| `RESEND_API_KEY`                                                                        | yes         | Resend Dashboard → API Keys.                                                                              |
| `EMAIL_FROM`                                                                            | yes         | A verified sender on your Resend domain, e.g. `NASCAR 25 <noreply@yourdomain.com>`.                       |
| `CRON_SECRET`                                                                           | yes         | Generate a high-entropy string: `openssl rand -hex 32`.                                                   |
| `NEXT_PUBLIC_APP_URL`                                                                   | yes         | Public origin, no trailing slash. Local: `http://localhost:3000`.                                         |

### Setting them in Vercel

Add each variable under **Project → Settings → Environment Variables**, scoped to
the environments that need it (Production / Preview / Development). Use the
provider's pooled string for `DATABASE_URL` on Vercel, and set `NEXT_PUBLIC_APP_URL`
to the deployment's public URL. Redeploy after changing values — Vercel injects
env vars at build and runtime, so the boot-time validation runs on every deploy.

## Status

Planning. See the implementation plan before building.
