import { FileCode } from "lucide-react";
import { type DiffFile, parseDiff } from "../rules/diff";

// The change the agent made, one file at a time, with both line numbers, like a pull request's files tab.
export function DiffView({ diff }: { diff: string }) {
  const files = parseDiff(diff);
  if (!files.length) {
    return (
      <div className="table-wrap empty-state">
        <FileCode aria-hidden="true" />
        <p>The agent changed no files in this run.</p>
      </div>
    );
  }
  return (
    <div className="diff">
      {files.map((file) => (
        <DiffFileCard key={file.path} file={file} />
      ))}
    </div>
  );
}

function DiffFileCard({ file }: { file: DiffFile }) {
  return (
    <section className="diff-file" aria-label={file.path}>
      <header className="diff-head">
        <FileCode aria-hidden="true" />
        <span className="diff-path">{file.path}</span>
        <span className="diff-added">+{file.added}</span>
        <span className="diff-removed">-{file.removed}</span>
      </header>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: axe scrollable-region-focusable needs it */}
      <section className="diff-scroll" aria-label={`Lines changed in ${file.path}`} tabIndex={0}>
        <table className="diff-table">
          <caption className="sr-only">Changes to {file.path}</caption>
          {file.hunks.map((hunk) => (
            <tbody key={`${hunk.lines[0]?.oldNumber ?? 0}-${hunk.lines[0]?.newNumber ?? 0}`}>
              <tr className="diff-hunk">
                <td colSpan={3}>{hunk.header}</td>
              </tr>
              {hunk.lines.map((line) => (
                <tr
                  key={`${line.kind}-${line.oldNumber ?? ""}-${line.newNumber ?? ""}`}
                  className={`diff-${line.kind}`}
                >
                  <td className="diff-number">{line.oldNumber ?? ""}</td>
                  <td className="diff-number">{line.newNumber ?? ""}</td>
                  <td className="diff-text">
                    <span className="sr-only">
                      {line.kind === "add" ? "Added: " : line.kind === "remove" ? "Removed: " : ""}
                    </span>
                    <code>{line.text}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </section>
    </section>
  );
}
