# MemWal Workshop Kit — Reading Tracker (verifiability)

> **You're on the `extension/verifiability` reference branch.** This is the
> completed extension. Workshop participants start on `main` and build this
> themselves.

A minimal Next.js app that exercises the core MemWal surface, with a third
"verify on walrus" card that proves the data really lives on Walrus and not
just in MemWal's local cache:

- `analyze()` — extract atomic facts and store them
- `remember()` — store raw text
- `recall()` — semantic search (now shows the Walrus blob ID for each hit)
- `restore()` *(new)* — pull what's on Walrus and reconcile with the local index

## What this extension teaches

- **Walrus is the source of truth.** The relayer's Postgres index is a cache.
  `restore()` proves it by re-pulling from Walrus and showing the count of
  blobs that exist independently of MemWal's infrastructure.
- **Every memory has a public, addressable identity.** The blob ID shown next
  to each recall result is the on-chain pointer. If MemWal disappeared
  tomorrow, the blobs would still be there.
- **Recovery is a first-class operation.** `restore()` exists because the
  trust boundary stops at Walrus. If the local index gets wiped, the same call
  rebuilds it. No data loss.

## What changed vs `main`

- `app/actions.ts` — adds a `verifyOnWalrus()` server action that calls
  `memwal.restore("reading-tracker", 100)` and returns the breakdown
  (`total`, `restored`, `skipped`).
- `app/page.tsx` — adds a third card with a "verify on walrus" button and
  a results panel that surfaces the big total. Also adds a small `walrus:…`
  badge next to each recall hit showing the truncated blob ID (hover for the
  full ID).
- `app/globals.css` — styles for the verify card and the blob-id badge.

## Branches

- `main` — the workshop starting point (this code).
- `extension/multi-namespace` — adds a namespace selector inside the tracker.
- `extension/verifiability` — adds a "what's on Walrus" panel using `restore()`.
- `extension/decisions-log` — adds a second app at `/decisions` sharing the same account.
- `extension/permissions-dashboard` *(stretch)* — adds an on-chain delegate key management view.

Each extension branch is a completed reference implementation. Workshop
participants start from `main` and build their chosen extension themselves
with Claude Code + the MemWal SDK skill file.

## What MemWal is

MemWal is a privacy-first AI memory layer for Sui + Walrus.
See https://docs.memwal.ai and the SDK at https://www.npmjs.com/package/@mysten-incubation/memwal.

## Using Claude Code in this repo

Two files at the repo root are written for AI assistants:

- **`SKILL.md`** — a self-contained MemWal SDK reference (installation, API surface,
  troubleshooting). Snapshot of https://github.com/MystenLabs/MemWal/blob/main/SKILL.md.
- **`CLAUDE.md`** — project conventions and guardrails for Claude Code.

Both are picked up automatically by Claude Code. If you're using a different AI
tool, paste `SKILL.md` into context before asking it to write MemWal code.

## Prerequisites

- Node.js 18+ (22 recommended — matches the rest of the monorepo)
- pnpm
- A MemWal account + a delegate key

## Setup

1. **Get credentials.** Sign in at one of:
   - Production (mainnet): https://memwal.ai
   - Staging (testnet): https://staging.memwal.ai

   Copy your **delegate private key** and your **account ID**.

2. **Configure.**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `MEMWAL_PRIVATE_KEY` (the delegate **private** key shown in the
   dashboard — *not* the public key) and `MEMWAL_ACCOUNT_ID`. If you used
   staging, also set `MEMWAL_SERVER_URL=https://relayer.staging.memwal.ai`.

   You can sanity-check your env before starting the dev server:
   ```bash
   pnpm verify
   ```
   This derives the public key from `MEMWAL_PRIVATE_KEY` and prints it so
   you can compare against the dashboard.

3. **Install + run.**
   ```bash
   pnpm install
   pnpm dev
   ```
   Open http://localhost:3000.

## How to use

- Log a few reading entries in the **log** card. Hit the **recall** card and
  search them — each hit now shows a `walrus:…` blob-id badge.
- Click **verify on walrus** in the third card. The big number is how many
  blobs actually exist on Walrus right now under your `reading-tracker`
  namespace. The breakdown shows how many were already in the local index
  vs. how many were freshly pulled from Walrus.
- For a stronger demo: drop the relayer's Postgres index (not something you
  can do from the workshop, but it's the failure mode `restore` defends
  against). Re-run `verify on walrus` and the `restored` count would be the
  full total — Walrus had everything.

## What's wired

| Surface | File |
|---|---|
| MemWal client (cached per process) | `lib/memwal.ts` |
| Server actions (`analyzeEntry`, `rememberEntry`, `searchReadingHistory`, `verifyOnWalrus`) | `app/actions.ts` |
| UI with three cards (recall, log, verify) | `app/page.tsx` |
| Env sanity-check script | `verify.ts` |

## Notes

- Memories are namespaced to `reading-tracker`. To start fresh, change the
  namespace in `lib/memwal.ts`.
- Saving uses `analyzeAndWait()`, which blocks until each extracted fact is
  durable. This avoids the ~3s indexer-lag window where a freshly-stored memory
  isn't yet recallable.
- The delegate key lives in `.env.local` and stays server-side. Server actions
  call MemWal; the browser only sees plaintext results.
