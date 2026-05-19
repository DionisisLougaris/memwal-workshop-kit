/**
 * Valid sub-namespaces inside the reading tracker. Lives in its own module
 * because `app/actions.ts` is a Next.js "use server" file, and those files
 * can only export async functions — no runtime consts allowed.
 *
 * Switching the dropdown in the UI flips which namespace `analyze`, `remember`,
 * and `recall` operate on. Same MemWalAccount, same delegate key, isolated data.
 */

export const NAMESPACES = ["books", "articles", "papers"] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE: Namespace = "books";

export function assertNamespace(ns: string): asserts ns is Namespace {
  if (!(NAMESPACES as readonly string[]).includes(ns)) {
    throw new Error(`unknown namespace: ${ns}`);
  }
}

export const NAMESPACE_LABELS: Record<Namespace, string> = {
  books: "books",
  articles: "articles",
  papers: "papers",
};

export const NAMESPACE_PLACEHOLDERS: Record<
  Namespace,
  { log: string; recall: string }
> = {
  books: {
    log: 'e.g. "just finished sapiens — found the agricultural revolution chapter mind-bending."',
    recall: "e.g. what did i think about sapiens?",
  },
  articles: {
    log: 'e.g. "read the stratechery piece on platform shifts — argues AI is more like cloud than mobile."',
    recall: "e.g. what have i read about platform shifts?",
  },
  papers: {
    log: 'e.g. "read attention is all you need. the self-attention mechanism removes recurrence entirely."',
    recall: "e.g. what papers cover attention mechanisms?",
  },
};
