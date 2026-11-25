// The two other ways in. Both reach the same tools as the page.
export function Connect({ mcpUrl }: { mcpUrl: string }) {
  return (
    <section className="card connect" aria-label="Connect">
      <div className="card-head">
        <span className="label">Use them elsewhere</span>
      </div>
      <div className="card-body">
        <p>In Claude or Cursor, add a custom connector with this address, then sign in when asked:</p>
        <pre className="tool-output">{mcpUrl}</pre>
        <p>In a terminal, from the repo root:</p>
        <pre className="tool-output">{"bun run cli login\nbun run cli upcoming-sessions"}</pre>
      </div>
    </section>
  );
}
