"use server";

import { getMemWal } from "@/lib/memwal";
import { assertNamespace } from "./namespaces";

export type AnalyzeOutcome =
  | { ok: true; verb: "analyze"; facts: string[]; saved: number; failed: number }
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
 * each one as its own memory under the given namespace.
 */
export async function analyzeEntry(
  text: string,
  namespace: string,
): Promise<AnalyzeOutcome> {
  if (!text.trim()) return { ok: false, error: "empty entry" };
  try {
    assertNamespace(namespace);
    const memwal = getMemWal();
    const result = await memwal.analyzeAndWait(text, namespace);
    return {
      ok: true,
      verb: "analyze",
      facts: result.facts.map((f) => f.text),
      saved: result.succeeded,
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
 * remember() — stores the entry exactly as typed under the given namespace.
 */
export async function rememberEntry(
  text: string,
  namespace: string,
): Promise<RememberOutcome> {
  if (!text.trim()) return { ok: false, error: "empty entry" };
  try {
    assertNamespace(namespace);
    const memwal = getMemWal();
    const result = await memwal.rememberAndWait(text, namespace);
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

export async function searchReadingHistory(
  query: string,
  namespace: string,
): Promise<SearchResult> {
  if (!query.trim()) return { ok: false, error: "empty query" };
  try {
    assertNamespace(namespace);
    const memwal = getMemWal();
    const result = await memwal.recall(query, 10, namespace);
    return {
      ok: true,
      results: result.results.map((r) => ({
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
