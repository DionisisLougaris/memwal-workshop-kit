import { fetchAccountSnapshot } from "@/app/actions";
import { RefreshButton } from "./RefreshButton";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const snapshot = await fetchAccountSnapshot();

  return (
    <main className="container">
      <header>
        <h1>permissions</h1>
        <p className="sub">
          who can read &amp; write your memories — straight from the Sui contract,
          not the relayer.
        </p>
      </header>

      {!snapshot.ok ? (
        <div className="error">{snapshot.error}</div>
      ) : (
        <>
          <section className="card">
            <label>account</label>
            <dl className="kv">
              <dt>account id</dt>
              <dd>
                <code>{snapshot.account.accountId}</code>
              </dd>
              <dt>owner</dt>
              <dd>
                <code>{snapshot.account.owner}</code>
              </dd>
              <dt>status</dt>
              <dd>
                {snapshot.account.active ? (
                  <span className="badge ok">active</span>
                ) : (
                  <span className="badge bad">frozen</span>
                )}
              </dd>
              <dt>network</dt>
              <dd>
                <span className="badge">{snapshot.account.network}</span>
              </dd>
              <dt>created</dt>
              <dd>
                {new Date(snapshot.account.createdAt).toLocaleString()}
              </dd>
            </dl>
          </section>

          <section className="card">
            <label>
              delegate keys ({snapshot.account.delegateKeys.length})
            </label>
            {snapshot.account.delegateKeys.length === 0 ? (
              <p className="empty">
                no delegate keys registered. add one from the dashboard.
              </p>
            ) : (
              <ul className="keys">
                {snapshot.account.delegateKeys.map((k) => {
                  const isCurrent = k.publicKey === snapshot.currentDelegatePubKey;
                  return (
                    <li key={k.publicKey} className={isCurrent ? "current" : ""}>
                      <div className="key-header">
                        <span className="key-label">{k.label || "(no label)"}</span>
                        {isCurrent && (
                          <span className="badge ok">this app</span>
                        )}
                      </div>
                      <dl className="kv-inline">
                        <dt>address</dt>
                        <dd>
                          <code>{k.suiAddress}</code>
                        </dd>
                        <dt>public key</dt>
                        <dd>
                          <code title={k.publicKey}>
                            {k.publicKey.slice(0, 16)}…{k.publicKey.slice(-8)}
                          </code>
                        </dd>
                        <dt>added</dt>
                        <dd>{new Date(k.createdAt).toLocaleString()}</dd>
                      </dl>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="hint">
              <strong>Add or revoke keys</strong> at{" "}
              <a
                href={
                  snapshot.account.network === "testnet"
                    ? "https://staging.memwal.ai"
                    : "https://memwal.ai"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {snapshot.account.network === "testnet"
                  ? "staging.memwal.ai"
                  : "memwal.ai"}
              </a>
              . Both actions require your wallet (only the owner can mutate
              the account). After the onchain tx confirms, refresh this page
              to see the new state.
            </p>
          </section>

          <RefreshButton />
        </>
      )}
    </main>
  );
}
