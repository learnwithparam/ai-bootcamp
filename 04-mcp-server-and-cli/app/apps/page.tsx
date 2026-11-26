import { KeyRound } from "lucide-react";
import { MCP_RESOURCE } from "../../auth/auth";
import { DevShell } from "../../components/DevShell";
import { RevokeButton } from "../../components/RevokeButton";
import { appsOf, type ConnectedApp } from "../../db/apps";
import { HOW_WORDS, scopeWords, whenWords } from "../../rules/plain";
import { requireUser } from "../session";

function HowToConnect() {
  return (
    <section className="panel" aria-labelledby="connect-title">
      <h2 className="panel-head" id="connect-title">
        Connect an app
      </h2>
      <div className="panel-body connect-steps">
        <div>
          <h3>Claude or Cursor</h3>
          <p>Add a custom connector with this address, then sign in when it asks.</p>
          <pre className="snippet">{MCP_RESOURCE}</pre>
        </div>
        <div>
          <h3>The terminal</h3>
          <p>From the repo root. It shows a code to approve in this browser.</p>
          <pre className="snippet">{"bun run cli login\nbun run cli upcoming-sessions"}</pre>
        </div>
      </div>
    </section>
  );
}

function AppRow({ app, now }: { app: ConnectedApp; now: Date }) {
  return (
    <tr>
      <th scope="row">
        {app.name}
        <span className="cell-sub">{HOW_WORDS[app.how]}</span>
      </th>
      <td>
        <ul className="scope-list">
          {scopeWords(app.scopes).map((words) => (
            <li key={words}>{words}</li>
          ))}
        </ul>
      </td>
      <td>{whenWords(app.connectedAt, now)}</td>
      <td>{app.lastUsed ? whenWords(app.lastUsed, now) : "Never"}</td>
      <td className="cell-actions">
        <RevokeButton clientId={app.clientId} name={app.name} />
      </td>
    </tr>
  );
}

function AppTable({ apps, now }: { apps: ConnectedApp[]; now: Date }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">App</th>
            <th scope="col">It can</th>
            <th scope="col">Connected</th>
            <th scope="col">Last used</th>
            <th scope="col">
              <span className="sr-only">Revoke</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => (
            <AppRow key={app.clientId} app={app} now={now} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NoApps = () => (
  <div className="empty-state">
    <KeyRound aria-hidden="true" />
    <strong>No apps are connected</strong>
    <p>Connect Claude, Cursor or the terminal below, and it shows up here.</p>
  </div>
);

// Every app that may act as this account, like Stripe's or GitHub's authorised apps page.
export default async function AppsPage() {
  const user = await requireUser("/apps");
  const apps = await appsOf(user.id);
  return (
    <DevShell user={user} current="apps">
      <header className="page-header">
        <div>
          <h1>Connected apps</h1>
          <p>These apps can call your tools as you. Revoke one and its next call is refused.</p>
        </div>
      </header>
      {apps.length ? <AppTable apps={apps} now={new Date()} /> : <NoApps />}
      <HowToConnect />
    </DevShell>
  );
}
