# Project context for Claude Code

This is the **MemWal Workshop Kit** — a minimal Next.js starter that workshop
participants fork to learn how to build on top of MemWal (a privacy-first AI
memory layer for Sui + Walrus).

## Read first

**`SKILL.md`** in the repo root is the canonical MemWal SDK reference. Read it
before doing any MemWal-related work — it covers installation, the SDK entry
points, the `remember` / `recall` / `analyze` API surface, configuration, and
common troubleshooting.

It is a snapshot of https://github.com/MystenLabs/MemWal/blob/main/SKILL.md —
if anything looks stale, that upstream version is the source of truth.

## What participants will do

Participants start on `main` (the working reading-tracker app), then build one
of the extensions on a feature branch using you (Claude Code) + the SDK skill
file. Completed reference implementations live on `extension/*` branches but
participants should not look at those until they're done.

## Project conventions

- TypeScript everywhere. `tsx` files for React, `ts` files for everything else.
- Server actions in `app/actions.ts` — anything that calls MemWal stays
  server-side so the delegate private key never reaches the browser.
- One MemWal client instance, cached in `lib/memwal.ts`. Read env once.
- Default namespace for the base app is `reading-tracker`. Extensions may
  introduce new namespaces; they should not change the default.
- Vanilla CSS in `app/globals.css`. No Tailwind, no UI framework — keep the
  surface area small so the MemWal mechanics are the focus.
- Use `analyzeAndWait()` / `rememberAndWait()` for any save+recall flow in
  the same user interaction. The fire-and-forget variants will trip the
  indexer-lag window and look broken.
- `/permissions` is **read-only by design**. Add/remove delegate keys lives
  at staging.memwal.ai / memwal.ai because it needs a wallet connection
  and Enoki/sponsored gas — out of scope for the base kit. If you're
  asked to add a "revoke" button, that's a separate, opinion-laden
  feature (wallet onboarding, signing UX, gas handling). Surface the
  tradeoff before adding it; don't silently extend the kit.

## What NOT to do

- Do not put the delegate private key in client code.
- Do not commit credentials to `.env.example` — that file is a template.
  Real values go in `.env.local` (gitignored).
- Do not introduce a database, auth layer, or third-party storage. The kit
  is intentionally MemWal-only.
- Do not add heavy dependencies. The current footprint is Next + React + the
  MemWal SDK + two tiny noble crypto libs for the verify script. Keep it
  there unless an extension genuinely needs more.
