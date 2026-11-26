import { clockTime } from "./when";

// A call line by line: the caller, the agent, and in between, what each tool answered the agent.
// Tool lines are drawn in the agent's yellow, so the desk can see what the diary said, not only what was spoken.
export type LineRow = { id: string; role: "caller" | "agent" | "tool"; text: string; at: Date };
const WHO = { caller: "Caller", agent: "Phone agent", tool: "Diary" };

export function Transcript({ lines }: { lines: LineRow[] }) {
  if (lines.length === 0) return <p className="empty-state">Nothing said yet.</p>;
  return (
    <ol className="transcript" aria-label="Transcript">
      {lines.map((line) => (
        <li key={line.id} className={`line line-${line.role}`}>
          <span className="line-who">{WHO[line.role]}</span>
          <span className="line-text">{line.text}</span>
          <time className="line-at">{clockTime(line.at)}</time>
        </li>
      ))}
    </ol>
  );
}
