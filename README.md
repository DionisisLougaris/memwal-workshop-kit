# Walrus Memory Workshop Kit — Reading Tracker (multi-namespace)

> **You're on the `extension/multi-namespace` reference branch.** This is the
> completed extension. Workshop participants start on `main` and build this
> themselves.

A minimal Next.js app that exercises the core Walrus Memory surface, with a dropdown
in the header to switch between sub-namespaces of the reading tracker:

- `books` — books you've read
- `articles` — articles / blog posts
- `papers` — research papers

All three live under the same MemWalAccount and the same delegate key. The only
thing separating them is the namespace string passed to each `analyze()` /
`remember()` / `recall()` call.

## What this extension teaches

- **Namespace as a runtime choice.** The decisions-log extension picks
  namespace at the route level (compile time); this one picks it via UI state
  (runtime). Same isolation primitive, different access pattern.
- **State hygiene matters.** Switching the dropdown wipes the recall results
  and the entry textarea — otherwise you'd see stale results from the previous
  namespace and think Walrus Memory mixed them up.
- **The action layer doesn't care.** The server actions take `namespace` as a
  string and validate it. The UI is free to decide where that string comes
  from — a route, a dropdown, a per-user setting, etc.

## What changed vs `main`

- `app/namespaces.ts` *(new)* — declares `NAMESPACES`, `Namespace` type,
  `assertNamespace` helper, plus per-namespace placeholder text.
- `app/actions.ts` — actions now take a `namespace` parameter, validated
  against the const list. `NAMESPACES` lives in `namespaces.ts` because
  `"use server"` files can only export async functions.
- `app/page.tsx` — adds a `<select>` switcher next to the header, a
  `selectedNamespace` state, wipes results/entry on namespace change, passes
  namespace to every action call, and surfaces the current namespace in
  labels and empty states.
- `app/globals.css` — styles for the namespace switcher.

## Branches

- `main` — the workshop starting point (this code).
- `extension/multi-namespace` — adds a namespace selector inside the tracker.
- `extension/verifiability` — adds a "what's on Walrus" panel using `restore()`.
- `extension/decisions-log` — adds a second app at `/decisions` sharing the same account.
- `extension/permissions-dashboard` *(stretch)* — adds an on-chain delegate key management view.

Each extension branch is a completed reference implementation. Workshop
participants start from `main` and build their chosen extension themselves
with Claude Code + the Walrus Memory SDK skill file.

## What Walrus Memory is

Walrus Memory is a privacy-first AI memory layer for Sui + Walrus.
See https://docs.memwal.ai and the SDK at https://www.npmjs.com/package/@mysten-incubation/memwal.

## Using Claude Code in this repo

Two files at the repo root are written for AI assistants:

- **`SKILL.md`** — a self-contained Walrus Memory SDK reference (installation, API surface,
  troubleshooting). Snapshot of https://github.com/MystenLabs/MemWal/blob/main/SKILL.md.
- **`CLAUDE.md`** — project conventions and guardrails for Claude Code.

Both are picked up automatically by Claude Code. If you're using a different AI
tool, paste `SKILL.md` into context before asking it to write Walrus Memory code.

## Prerequisites

- Node.js 18+ (22 recommended — matches the rest of the monorepo)
- pnpm
- A Walrus Memory account + a delegate key

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

- Pick a namespace from the dropdown (`books`, `articles`, or `papers`).
- Log entries in the **log** card — they're saved under whichever namespace is
  selected. `analyze()` extracts atomic facts; `remember()` stores raw.
- Recall from the **recall** card — it only searches the currently selected
  namespace.
- Switch the dropdown to see different content. The recall results and entry
  draft clear on every switch, so you can't accidentally save to the wrong
  namespace.

## What's wired

| Surface | File |
|---|---|
| Walrus Memory client (cached per process) | `lib/memwal.ts` |
| Namespace consts + helpers (not a "use server" module) | `app/namespaces.ts` |
| Namespace-aware server actions | `app/actions.ts` |
| Page with namespace switcher | `app/page.tsx` |
| Env sanity-check script | `verify.ts` |

## Notes

- Valid namespaces are declared in `app/namespaces.ts` and validated by every
  server action. A misbehaving client can't write to arbitrary namespaces.
- Saving uses `analyzeAndWait()` / `rememberAndWait()`, which block until each
  memory is durable. This avoids the ~3s indexer-lag window where a freshly-
  stored memory isn't yet recallable.
- The delegate key lives in `.env.local` and stays server-side. Server actions
  call Walrus Memory; the browser only sees plaintext results.
