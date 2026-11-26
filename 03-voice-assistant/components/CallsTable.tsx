import { callTime, cents, duration } from "./when";

// The fields of a call this table shows.
export type CallRow = {
  id: string;
  status: "live" | "ended";
  endedBecause: string | null;
  seconds: number;
  costUsd: number;
  startedAt: Date;
};

// Every call the phone took, newest first. A call still running is marked, and its page updates as it goes.
export function CallsTable({ calls, now }: { calls: CallRow[]; now: Date }) {
  if (calls.length === 0)
    return <p className="empty-state">No calls yet. Ring the line from the phone page.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>How it ended</th>
            <th className="num">Length</th>
            <th className="num">Cost</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr key={call.id}>
              <th scope="row">
                <a className="row-link" href={`/desk/calls/${call.id}`}>
                  {callTime(call.startedAt, now)}
                </a>
              </th>
              <td>
                {call.status === "live" ? (
                  <span className="pill pill-wait">On the line</span>
                ) : (
                  (call.endedBecause ?? "Ended")
                )}
              </td>
              <td className="num">{call.status === "live" ? "" : duration(call.seconds)}</td>
              <td className="num">{call.status === "live" ? "" : cents(call.costUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
