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

## Status

Planning. See the implementation plan before building.
