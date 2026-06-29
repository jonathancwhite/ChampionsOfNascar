# CLAUDE.md — NASCAR 25 Championship Tracker

Guidance for working in this repository.

## Project

A web app for running an online NASCAR career across shared leagues, built around the settings of the **NASCAR 25** game (iRacing Studios).

League creators configure a league (series, race count, % of laps, name), friends join with a unique code, the season schedule is auto-generated from the NASCAR 25 track pool, admins set race dates (which notify members by email) and record results that roll up into each player's career profile.

> NASCAR 25 exposes no public API or data export — all participants and results are entered manually by the league admin.

### Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Clerk (auth)
- Resend (email) + Vercel Cron (reminders)
- Tailwind CSS + shadcn/ui
- Hosted on Vercel

### Where things live

- `plans/` — implementation plan + per-story specs. `plans/00-backlog.md` is the backlog overview; `plans/NASCAR-0XX-*.md` is one file per story.
- Task board lives **outside this repo** at `C:\Users\JCLW\Desktop\productivity\tasks.md`. Stories are tracked there as `NSC-0XX` with the board: **Backlog → In Progress → In Review → Done**.

## Workflow — one story per feature branch

Each story is completed on **its own feature branch**, named:

```
feat/descriptive-branch-name
```

Use a short, descriptive name tied to the story — e.g. story `NSC-020: Create League` → `feat/create-league`.

### Steps per story

1. **Branch off `main`:**
   ```bash
   git checkout main && git pull
   git checkout -b feat/descriptive-branch-name
   ```
2. **Move the card to In Progress** in `C:\Users\JCLW\Desktop\productivity\tasks.md` (cut the line from `## Backlog`, paste under `## In Progress`).
3. **Do the work** for that one story. Keep the branch scoped to the single story.
4. **Open a PR** when the work is done (see below).
5. **Move the card to In Review** and attach the PR link (see below).

### Opening the PR

Push the branch and open a PR against `main`:

```bash
git push -u origin feat/descriptive-branch-name
gh pr create --base main --title "NSC-0XX: <story title>" --body "<summary>"
```

### Updating the task board

When the work is done **and** the PR is created, in `C:\Users\JCLW\Desktop\productivity\tasks.md`:

1. **Move the card to the `## In Review` panel** (cut from `## In Progress`, paste under `## In Review`).
2. **Attach the PR to the card's notes.** The board cards are single checkbox lines today, so record the PR as an indented sub-bullet (the card's "notes") directly under the card:

   ```markdown
   ## In Review

   - [ ] [B - Leagues & Membership] NSC-020: Create League
     - PR: https://github.com/jonathancwhite/nascar25-championship/pull/<n>
   ```

   Add any extra context as additional indented sub-bullets under the same card.

A card only moves to **In Review** once both are true: the story is complete and a PR exists. After the PR merges, move the card to `## Done`.

### After the PR merges

Move the card to `## Done`, then sync local git, prune the merged remote branch, and delete the local branch:

```bash
git fetch --prune
git checkout main && git pull
git branch -d feat/descriptive-branch-name
```

`git fetch --prune` removes the stale remote-tracking ref for the merged feature branch. **Always delete the local branch once its remote has been pruned** — leftover local branches whose upstream is gone are dead and should not linger. List them with `git branch -vv` (look for `: gone]`) and remove each with `git branch -d <name>`.

## Notes

- Story IDs: the board (`tasks.md`) uses `NSC-0XX`; the spec files in `plans/` use `NASCAR-0XX`. Same number = same story.
- Keep branches single-story. If work splits into multiple stories, use a branch + PR per story.
