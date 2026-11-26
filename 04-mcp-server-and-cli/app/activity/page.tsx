import { History } from "lucide-react";
import Link from "next/link";
import { describeTools } from "../../agent/tools/describe";
import { DevShell } from "../../components/DevShell";
import { type ActivityRow, activityOf } from "../../db/activity";
import { inputWords, viaWords, whenWords } from "../../rules/plain";
import { requireUser } from "../session";

type Show = "all" | "failed";

function CallRow({ call, title, now }: { call: ActivityRow; title: string; now: Date }) {
  return (
    <tr>
      <td>
        <time dateTime={call.calledAt.toISOString()} title={call.calledAt.toISOString()}>
          {whenWords(call.calledAt, now)}
        </time>
      </td>
      <th scope="row">{title}</th>
      <td>{viaWords(call.via, call.appName)}</td>
      <td className="cell-input">{inputWords(call.input)}</td>
      <td>
        {call.outcome === "done" ? (
          <span className="pill pill-pass">Done</span>
        ) : (
          <>
            <span className="pill pill-fail">Failed</span>
            <span className="cell-sub">{call.message}</span>
          </>
        )}
      </td>
      <td className="cell-number">{call.ms} ms</td>
    </tr>
  );
}

function ShowTabs({ show, all, failed }: { show: Show; all: number; failed: number }) {
  return (
    <nav className="tabs" aria-label="Filter">
      <Link href="/activity" className="tab" aria-current={show === "all" ? "page" : undefined}>
        All <span className="tab-count">{all}</span>
      </Link>
      <Link
        href="/activity?show=failed"
        className="tab"
        aria-current={show === "failed" ? "page" : undefined}
      >
        Failed <span className="tab-count">{failed}</span>
      </Link>
    </nav>
  );
}

function CallTable({ calls, now }: { calls: ActivityRow[]; now: Date }) {
  const titles = Object.fromEntries(describeTools().map((tool) => [tool.name, tool.title]));
  return (
    <div className="table-wrap">
      <table className="table activity-table">
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Tool</th>
            <th scope="col">From</th>
            <th scope="col">Input</th>
            <th scope="col">Outcome</th>
            <th scope="col">Took</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <CallRow key={call.id} call={call} title={titles[call.tool] ?? call.tool} now={now} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Every tool call made as this account, from this page, a plain-words question, or a connected app.
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireUser("/activity");
  const show: Show = (await searchParams).show === "failed" ? "failed" : "all";
  const calls = await activityOf(user.id);
  const failed = calls.filter((call) => call.outcome === "failed");
  const shown = show === "failed" ? failed : calls;
  return (
    <DevShell user={user} current="activity">
      <header className="page-header">
        <div>
          <h1>Activity</h1>
          <p>Every tool call made as you, from every way in. This page shows the newest hundred.</p>
        </div>
      </header>
      <ShowTabs show={show} all={calls.length} failed={failed.length} />
      {shown.length ? (
        <CallTable calls={shown} now={new Date()} />
      ) : (
        <div className="empty-state">
          <History aria-hidden="true" />
          <strong>{show === "failed" ? "No failed calls" : "No calls yet"}</strong>
          <p>Run a tool on the Tools page, or from a connected app, and it shows up here.</p>
        </div>
      )}
    </DevShell>
  );
}
