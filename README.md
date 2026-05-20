# MemWal Workshop Kit — Reading Tracker + Permissions Dashboard

> **You're on the `extension/permissions-dashboard` reference branch.** This
> is the completed extension. Workshop participants start on `main` and build
> this themselves.

The reading tracker plus a second page that shows the on-chain
`MemWalAccount` directly — owner, active flag, every delegate key — read
straight from Sui, bypassing the relayer entirely.

- `/` — reading tracker (`analyze()` / `remember()` / `recall()` via the relayer)
- `/permissions` — read-only view of who can read & write your memories

## What this extension teaches

- **The account is on Sui, not on the relayer.** Anyone with the `accountId`
  can verify the owner and the delegate-key list by reading the public
  Move object. We do that with one `SuiClient.getObject()` call.
- **MemWal has two planes.** Data plane (analyze/remember/recall) goes
  through the relayer for performance. Control plane (account, delegate
  keys, active flag) is enforced onchain. The permissions page exercises
  the second plane.
- **Revocation is a Move tx, not a database update.** This page only reads
  state — adding or removing a delegate key requires the *owner* to sign
  with their wallet, which lives in the staging.memwal.ai / memwal.ai
  dashboards. We link out for those actions instead of reimplementing
  wallet signing.

## Read-only by design — and what's missing

This branch deliberately stops at "show what's on chain." Mutations
(adding / removing delegate keys) live at staging.memwal.ai / memwal.ai
because they need:

- a wallet connection (`@mysten/dapp-kit` or similar)
- a gas-funded Sui account *or* Enoki-sponsored transactions
- a second auth flow layered on top of the delegate-key flow this kit
  already has

That's another ~150 lines plus participant-side setup we can't easily
pre-provision. It's outside the workshop's scope, but it's the natural
**stretch extension**: take this branch, wire up `addDelegateKey()` /
`removeDelegateKey()` (already exported from
`@mysten-incubation/memwal/account`) behind a wallet-connect button, and
mutations move into this UI.

### How "grant a collaborator access" maps onto today's primitives

The upstream MemWal dashboard talks about *delegate keys*, not
*collaborators* — but the mechanism is the same primitive either way:

1. Your collaborator generates a delegate keypair on their side (same way
   you generated yours).
2. They send you their **public key** (never the private key).
3. You add it as a delegate from your dashboard, with a label like
   `bob@example.com`.
4. They use their private key with the MemWal SDK and get full read+write
   to your memory.
5. Revoke at any time — the next request signed with their key fails
   verification on-chain.

So the "share with a collaborator" flow works today; it's just not framed
that way in the dashboard UI. The `/permissions` page in this branch
exists in part to make that primitive visible: anyone with the account ID
can verify exactly which keys (and therefore which apps or collaborators)
currently have access.

What's still missing at the protocol level, regardless of UI:
- **scoped access** (read-only, or only one namespace — all delegates are
  full-power today)
- **invitation flows** (no "send Bob a link, he gets a key generated for
  him" — both sides have to coordinate on the public key out of band)

## What changed vs `main`

- `lib/sui-chain.ts` *(new)* — `getSuiNetwork()` (infers testnet vs mainnet
  from `MEMWAL_SERVER_URL`) + `fetchAccountInfo(accountId)` using
  `SuiGrpcClient` from `@mysten/sui/grpc` (JSON-RPC is deprecated — see
  https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration).
- `app/actions.ts` — adds a `fetchAccountSnapshot()` server action that
  returns the account info plus the current delegate's public key (so the
  UI can highlight "this is me").
- `app/permissions/page.tsx` *(new)* — server component that fetches on
  every request and renders account + delegate-key cards.
- `app/permissions/RefreshButton.tsx` *(new)* — tiny client component that
  calls `router.refresh()` so participants can re-read chain state after
  mutating it on the upstream dashboard.
- `app/layout.tsx` — adds a top nav linking `/` and `/permissions`.
- `app/globals.css` — nav + permissions-page styling (kv lists, badges,
  delegate-key cards).
- `package.json` — adds `@mysten/sui` as a direct dependency.

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

- Visit `/` and use the reading tracker as usual (analyze/remember/recall).
- Visit `/permissions` to see the on-chain account:
  - account ID, owner address, active flag, network
  - every registered delegate key with its label, address, public key prefix,
    and creation timestamp
  - a "this app" badge on whichever key matches your `MEMWAL_PRIVATE_KEY`
- To add or revoke a key, click through to the upstream
  staging.memwal.ai / memwal.ai dashboard (only the owner's wallet can sign
  that transaction). After it confirms, hit "refresh from chain" on the
  permissions page to see the updated list.

## What's wired

| Surface | File |
|---|---|
| MemWal client (cached per process) | `lib/memwal.ts` |
| Sui chain client + `fetchAccountInfo` | `lib/sui-chain.ts` |
| Server actions including `fetchAccountSnapshot` | `app/actions.ts` |
| Reading tracker page | `app/page.tsx` |
| Permissions page (server component) | `app/permissions/page.tsx` |
| Refresh button (client component) | `app/permissions/RefreshButton.tsx` |
| Top nav + layout | `app/layout.tsx` |
| Env sanity-check script | `verify.ts` |

## Notes

- Memories are namespaced to `reading-tracker`. To start fresh, change the
  namespace in `lib/memwal.ts`.
- Saving uses `analyzeAndWait()`, which blocks until each extracted fact is
  durable. This avoids the ~3s indexer-lag window where a freshly-stored memory
  isn't yet recallable.
- The delegate key lives in `.env.local` and stays server-side. Server actions
  call MemWal; the browser only sees plaintext results.
