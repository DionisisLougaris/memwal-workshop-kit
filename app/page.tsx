"use client";

import { useState, useTransition } from "react";
import {
  analyzeEntry,
  rememberEntry,
  searchReadingHistory,
  type AnalyzedFactStatus,
  type SearchHit,
} from "./actions";

type LastSave =
  | {
      verb: "analyze";
      facts: AnalyzedFactStatus[];
      succeeded: number;
      failed: number;
    }
  | { verb: "remember"; text: string; blobId: string };

export default function Home() {
  const [query, setQuery] = useState("");
  const [entry, setEntry] = useState("");
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [lastSave, setLastSave] = useState<LastSave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [analyzing, startAnalyze] = useTransition();
  const [remembering, startRemember] = useTransition();

  const saving = analyzing || remembering;

  function handleSearch() {
    setError(null);
    startSearch(async () => {
      const r = await searchReadingHistory(query);
      if (!r.ok) {
        setError(r.error);
        setResults(null);
        return;
      }
      setResults(r.results);
    });
  }

  function handleAnalyze() {
    setError(null);
    startAnalyze(async () => {
      const r = await analyzeEntry(entry);
      if (!r.ok) {
        setError(r.error);
        setLastSave(null);
        return;
      }
      setLastSave({
        verb: "analyze",
        facts: r.facts,
        succeeded: r.succeeded,
        failed: r.failed,
      });
      setEntry("");
    });
  }

  function handleRemember() {
    setError(null);
    startRemember(async () => {
      const r = await rememberEntry(entry);
      if (!r.ok) {
        setError(r.error);
        setLastSave(null);
        return;
      }
      setLastSave({ verb: "remember", text: r.text, blobId: r.blobId });
      setEntry("");
    });
  }

  function handleClearRecall() {
    setResults(null);
    setQuery("");
    setError(null);
  }

  return (
    <main className="container">
      <header>
        <h1>memwal reading tracker</h1>
        <p className="sub">
          log what you read. recall what you read. across sessions, models, and devices.
        </p>
      </header>

      <section className="card">
        <label htmlFor="q">recall()</label>
        <input
          id="q"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query && !searching) handleSearch();
          }}
          placeholder="e.g. what did i think about sapiens?"
        />
        <div className="button-row">
          <button onClick={handleSearch} disabled={!query || searching}>
            {searching ? "searching…" : "recall"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleClearRecall}
            disabled={searching || (!results && !query)}
          >
            clear
          </button>
        </div>

        {results && results.length > 0 && (
          <ul className="results">
            {results.map((m) => (
              <li key={m.blobId}>
                <span className="dist">d={m.distance.toFixed(2)}</span>
                <span>{m.text}</span>
              </li>
            ))}
          </ul>
        )}
        {results && results.length === 0 && (
          <p className="empty">no matching memories yet — log a reading session below.</p>
        )}
      </section>

      <section className="card">
        <label htmlFor="e">log a reading session</label>
        <textarea
          id="e"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder='e.g. "just finished sapiens — found the agricultural revolution chapter mind-bending, less convinced by the section on happiness."'
          rows={5}
        />
        <div className="button-row">
          <button onClick={handleAnalyze} disabled={!entry || saving}>
            {analyzing ? "extracting…" : "analyze() — extract & save facts"}
          </button>
          <button
            className="secondary"
            onClick={handleRemember}
            disabled={!entry || saving}
          >
            {remembering ? "saving…" : "remember() — save raw text"}
          </button>
        </div>
        <p className="hint">
          <strong>analyze()</strong> runs an LLM pass that extracts atomic facts and
          canonicalizes phrasing (e.g. "i like X" → "user likes X").{" "}
          <strong>remember()</strong> stores exactly what you typed.
          Try both with the same input — recall the same query — see the difference.
        </p>

        {lastSave?.verb === "analyze" && (
          <div className="facts">
            <h3>
              analyze() → {lastSave.succeeded} saved
              {lastSave.failed > 0 ? `, ${lastSave.failed} failed` : ""}
            </h3>
            {lastSave.facts.length > 0 ? (
              <ul>
                {lastSave.facts.map((f, i) => (
                  <li key={i} className={f.saved ? "saved" : "failed"}>
                    {f.saved ? "✓" : "✗"} {f.text}
                    {!f.saved && f.error ? (
                      <span className="fact-err"> — {f.error}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">no facts extracted — try a more concrete entry.</p>
            )}
            {lastSave.failed > 0 && (
              <p className="hint" style={{ color: "var(--bad)" }}>
                Some facts didn&apos;t persist. The relayer accepted them but
                the storage step (Walrus upload) failed or timed out. Recall
                won&apos;t find these. Try again, or report to the MemWal team
                if it keeps happening.
              </p>
            )}
          </div>
        )}

        {lastSave?.verb === "remember" && (
          <div className="facts">
            <h3>remember() → stored raw</h3>
            <ul>
              <li>✓ {lastSave.text}</li>
            </ul>
          </div>
        )}
      </section>

      {error && <div className="error">{error}</div>}
    </main>
  );
}
