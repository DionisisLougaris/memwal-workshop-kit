"use server";

import { getMemWal } from "@/lib/memwal";
import { fetchAccountInfo, type AccountInfo } from "@/lib/sui-chain";

/**
 * Maximum cosine distance for a recall hit to count as "relevant."
 *
 * `recall()` returns the top-K closest memories by cosine distance, but it does
 * NOT cut off at "no longer relevant." If you have 5 memories and ask about
 * something unrelated, you'll get all 5 back. We filter post-hoc.
 *
 * Rough guide for OpenAI text-embedding-3-small (what Walrus Memory uses today):
 *   < 0.3 → near-duplicate or paraphrase
 *   0.3 – 0.6 → same topic, related
 *   0.6 – 0.8 → vaguely related, mostly noise
 *   > 0.8 → unrelated, filler
 *
 * 0.7 is a forgiving default. Tighten for fewer false positives, loosen if
 * you're seeing too many empty recalls.
 */
const MAX_RECALL_DISTANCE = 0.7;

export type AnalyzedFactStatus = {
  text: string;
  saved: boolean;
  /** When !saved, a short reason: "failed", "timeout", or the server error message. */
  error?: string;
};

export type AnalyzeOutcome =
  | {
      ok: true;
      verb: "analyze";
      facts: AnalyzedFactStatus[];
      total: number;
      succeeded: number;
      failed: number;
    }
  | { ok: false; error: string };

export type RememberOutcome =
  | { ok: true; verb: "remember"; text: string; blobId: string }
  | { ok: false; error: string };

export type SearchHit = { blobId: string; text: string; distance: number };

export type SearchResult =
  | { ok: true; results: SearchHit[] }
  | { ok: false; error: string };

/**
 * analyze() — feeds the entry to an LLM that extracts atomic facts and stores
 * each one as its own memory. Phrasing is canonicalized (e.g. "i like X" →
 * "user likes X"), which makes recall robust to paraphrasing.
 */
export async function analyzeEntry(text: string): Promise<AnalyzeOutcome> {
  if (!text.trim()) return { ok: false, error: "empty entry" };
  try {
    const memwal = getMemWal();
    const result = await memwal.analyzeAndWait(text);

    // The SDK returns `facts[]` (everything the LLM extracted) plus
    // `results[]` (per-job status: "done" / "failed" / "timeout"). Match them
    // by id so the UI can show which facts actually persisted vs. which the
    // relayer failed to store. Without this we'd claim success on every fact
    // regardless of upload outcome — a silent data-loss bug.
    const facts: AnalyzedFactStatus[] = result.facts.map((f) => {
      const status = result.results.find((r) => r.id === f.id);
      const ok = status?.status === "done";
      return {
        text: f.text,
        saved: ok,
        error: ok
          ? undefined
          : status?.error ?? status?.status ?? "no status returned",
      };
    });

    console.log(
      `[analyze] "${text.slice(0, 60)}…" → extracted ${result.facts.length}, succeeded ${result.succeeded}, failed ${result.failed}`,
    );

    return {
      ok: true,
      verb: "analyze",
      facts,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

/**
 * remember() — stores the entry exactly as typed, no fact extraction, no
 * canonicalization. Useful when the wording matters or you've already
 * pre-processed the text yourself.
 */
export async function rememberEntry(text: string): Promise<RememberOutcome> {
  if (!text.trim()) return { ok: false, error: "empty entry" };
  try {
    const memwal = getMemWal();
    const result = await memwal.rememberAndWait(text);
    return {
      ok: true,
      verb: "remember",
      text,
      blobId: result.blob_id,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

/**
 * Fetch the MemWalAccount object directly from Sui — owner, delegate keys,
 * active flag, etc. Includes the public key of the delegate this app is using
 * so the UI can highlight "this is me" in the delegate list.
 */
export type AccountSnapshotResult =
  | {
      ok: true;
      account: AccountInfo;
      currentDelegatePubKey: string;
    }
  | { ok: false; error: string };

export async function fetchAccountSnapshot(): Promise<AccountSnapshotResult> {
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  if (!accountId) {
    return { ok: false, error: "MEMWAL_ACCOUNT_ID is not set in .env.local" };
  }
  try {
    const [account, currentDelegatePubKey] = await Promise.all([
      fetchAccountInfo(accountId),
      getMemWal().getPublicKeyHex(),
    ]);
    return { ok: true, account, currentDelegatePubKey };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

export async function searchReadingHistory(query: string): Promise<SearchResult> {
  if (!query.trim()) return { ok: false, error: "empty query" };
  try {
    const memwal = getMemWal();
    const result = await memwal.recall(query, 10);
    return {
      ok: true,
      results: result.results
        .filter((r) => r.distance < MAX_RECALL_DISTANCE)
        .map((r) => ({
          blobId: r.blob_id,
          text: r.text,
          distance: r.distance,
        })),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}
