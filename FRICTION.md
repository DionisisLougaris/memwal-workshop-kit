# Friction Log — Building the Workshop Kit with SKILL.md

A running list of where SKILL.md fell short while building this prototype.
Audience: workshop facilitators deciding what to pre-solve, and the MemWal team
deciding what to fix in SKILL.md / docs.

---

## 1. Return-type shapes are not documented

**Where it hit:** Writing `app/actions.ts`, rendering `analyze` and `recall` results.

SKILL.md tells me `analyzeAndWait` returns `{ results, facts, total, succeeded, failed, owner }` and `recall` returns `{ results: [{ blob_id, text, distance }], total }` — but it doesn't define `AnalyzedFact`. I had to grep the SDK source to learn `facts[].text` (not `.fact`, not `.content`).

**Workshop impact:** A vibe-coding participant will either:
- guess and fail TypeScript
- use `any` and lose IDE help
- have Claude read the SDK source (which works, but eats time and tokens)

**Fix suggestion:** Add an "All response shapes" section to SKILL.md with the exported TypeScript interfaces inline. Or link to the `types.ts` file directly.

---

## 2. Which "wait" variant to use is unclear

**Where it hit:** Picking between `analyze()` + `waitForRememberJobs()` vs `analyzeAndWait()`.

SKILL.md shows both flows in the Quick Start. It's not obvious which one a beginner should default to. The "fire and poll" version trips the ~3s eventual-consistency window if you immediately recall after.

**Workshop impact:** Participants will write `analyze` + immediate `recall` and see empty results. They'll think MemWal is broken.

**Fix suggestion:** In SKILL.md Quick Start, lead with `analyzeAndWait` / `rememberAndWait`. Add a one-line callout: "if you save and recall in the same flow, use the `*AndWait` variant — there's a few-second indexer lag otherwise."

---

## 3. Where to put the delegate key in a Next.js app isn't specified

**Where it hit:** Deciding between client/server placement of the SDK call.

SKILL.md examples instantiate `MemWal.create({ key })` inline. In a Next.js App Router app, the delegate private key should never reach the browser. I had to make the architectural decision (server actions, env vars) without guidance.

**Workshop impact:** A participant might paste the snippet straight into `page.tsx` and ship a delegate key to the client.

**Fix suggestion:** Add a "Framework patterns" subsection with one snippet per framework: Next.js server actions, Express endpoint, plain Node.js. Each emphasizes "keep the key server-side."

---

## 4. Namespace strategy is undocumented

**Where it hit:** Choosing `namespace: "reading-tracker"`.

SKILL.md mentions namespaces exist and shows the config field. It doesn't say *why* you'd use one vs the default, or what a good naming pattern is (per-app? per-user? per-feature?).

**Workshop impact:** Participants will either ignore namespaces (everything lands in "default" and bleeds across their experiments) or over-engineer them.

**Fix suggestion:** One-paragraph "Namespace as the only isolation primitive" callout in SKILL.md. Mention: namespace per app is the common pattern; you can also nest per-user if your app multi-tenants.

---

## 5. Staging vs production relayer choice is buried

**Where it hit:** Writing `.env.example`.

SKILL.md lists both URLs in a table but doesn't say which to pick for a hackathon / learning context. Mainnet costs real Walrus storage; testnet is free but no SLA.

**Workshop impact:** Workshop participants on mainnet may hit costs / quota; on staging may hit reliability bumps.

**Fix suggestion:** Add a note: "For learning / prototypes, use the staging relayer. For production, use the mainnet relayer."

---

## 6. No mention of polling timeouts

**Where it hit:** Calling `analyzeAndWait` with default options.

The default `timeoutMs` is 120000 (from the SDK types). For a workshop demo, 2 minutes is way too long if something stalls — participants will sit staring at a spinner. SKILL.md mentions `opts?` exists but doesn't show how to override the timeout.

**Workshop impact:** A stuck job hangs the UI for 2 minutes before reporting failure.

**Fix suggestion:** Show `{ timeoutMs: 30_000 }` in the SKILL.md examples and explain when to tune it.

---

## 7. SKILL.md doesn't explain what `analyze` actually does

**Where it hit:** Deciding `remember` vs `analyze` for the reading-tracker save path.

SKILL.md describes `analyze` as "extract facts and accept one memory job per fact" but doesn't explain *why* you'd use it over `remember`. The MemWal 201 deck (p9) has the explanation: feed in narrative text, the LLM canonicalizes it into atomic facts, each is independently recallable.

**Workshop impact:** Participants will default to `remember` (verbose, harder to recall later) when `analyze` is the better fit for most chat / journal-style inputs.

**Fix suggestion:** SKILL.md should include the "atomic / durable / rewritable" framing from the 201 deck and say "prefer `analyze` for free-form input, `remember` only for already-distilled facts."

---

# Participant Friction (live observations)

Friction observed when an actual first-time user runs the kit. Distinct from the
SKILL.md gaps above — these are workshop-day pitfalls.

## P1. Dashboard hands you THREE strings, no labels on which goes where ✅ partial fix in kit

**Observed:** User signed in to staging.memwal.ai and got an accountId, a
public key, and a private key. Pasted them into `.env.local`, hit Save in the
UI, got a 401 with no message body.

The dashboard surfaces all three credentials; the env var was originally named
`MEMWAL_KEY` with no hint of which one to use. Easy to paste the public key
into `MEMWAL_KEY` and get a silent 401 — the relayer deliberately returns no
body on auth failures (`constant_time_reject` in services/server/src/auth.rs)
to prevent timing/info leakage, so the participant has zero feedback on what's
wrong.

**Workshop impact:** Likely #1 first-call failure. Indistinguishable from
"server is down" without diagnostic guidance.

**Fix applied in this kit:**
- Renamed env var to `MEMWAL_PRIVATE_KEY` so it's unambiguous which string
  goes there.
- Added `pnpm verify` script that derives the public key from
  `MEMWAL_PRIVATE_KEY` and prints it so users can compare against the
  dashboard before ever hitting the relayer.

**Still to fix upstream:**
- The MemWal dashboard itself could label the strings as "paste this one
  into your env var" to remove the ambiguity at the source.
- The existing MemWal apps (chatbot, noter, researcher) all use `MEMWAL_KEY`
  as the env var name — they have the same ambiguity. Would be a small
  cleanup to rename in those too.

## P2. Participants put real credentials in `.env.example`

**Observed:** User edited `.env.example` directly (which gets committed)
instead of copying to `.env.local`. Their staging private key landed in chat
and would have landed in git if committed.

**Workshop impact:** Real key leakage risk, even on testnet. Worse on mainnet.

**Fix suggestions:**
- README step 2 should be louder: "**Never edit `.env.example` — copy it to
  `.env.local` first.**"
- Consider shipping an interactive `pnpm setup` script that prompts for the
  three values and writes `.env.local` directly, so participants never touch
  `.env.example`.

## P3. 401 with empty body is a dead end for non-experts

**Observed:** "MemWal server error (401) <no message>" — the user couldn't
debug from this. There's no hint of which auth step failed.

**Workshop impact:** Without the facilitator on hand, this is a brick wall.

**Fix suggestions:**
- Surface a smarter client-side error in `app/actions.ts` that catches 401
  specifically and returns: "401 from relayer — typically (a) wrong key,
  (b) key not registered on this account, or (c) staging vs mainnet mismatch.
  Check `.env.local`."
- Longer term, the relayer could return a structured error code (without
  revealing which step failed — just a stable code for the client to map to
  a helpful message).

## P4. `recall()` returns top-K by distance — no relevance threshold ✅ fixed in kit

**Observed:** User logged *"i ate beef yesterday"* then recalled *"what did i
eat yesterday"*. The beef result came back at distance 0.48 (correct), but
*also* four unrelated Star Wars / Dune memories at distances 0.84–0.91 —
because the namespace only had ~5 entries total and recall asks for top 10.

The user's reasonable interpretation: "MemWal is returning random stuff."
The actual behavior: vector recall is top-K-by-distance, full stop. It
sorts everything by similarity and returns the K closest; "closest" is not
the same as "relevant," especially when the corpus is small.

**Workshop impact:** Every participant will hit this within their first
5 recalls. The first time you have 3+ unrelated memories in a namespace and
ask anything, the noise leaks in. Without context for what the distance
column means, it reads as broken.

**Fix applied in this kit:**
- Added a `MAX_RECALL_DISTANCE = 0.7` constant in `app/actions.ts` and a
  `.filter()` step before mapping results. Anything with `distance >= 0.7`
  gets dropped before the UI sees it.
- The constant is heavily commented with the rough distance scale for
  text-embedding-3-small so participants can tune it.

**Still to fix upstream:**
- SKILL.md should call out the top-K-without-threshold behavior in the
  recall section. Right now it just says "semantic search for memories,"
  which gives no hint that you'll get filler when the corpus is small.
- SKILL.md could include the distance-scale rough guide
  (0.0–0.3 duplicate / 0.3–0.6 related / 0.6–0.8 noise / 0.8+ unrelated)
  so people know what numbers to filter at.
- The SDK could expose a `minDistance` / `maxDistance` option on
  `recall()` so consumers don't have to post-filter. The Vercel AI
  middleware already has `minRelevance`; the base `MemWal.recall()` does not.

