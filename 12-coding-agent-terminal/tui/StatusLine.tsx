/** @jsxImportSource @opentui/react */
import { money } from "@bootcamp/coding-harness/rules/labels";
import type { Status } from "../rules/screen";
import { COLOR } from "./colors";

// One line under the input box: where the agent works, how far it got, what it cost, and the last check.

export function StatusLine({ where, status, detail }: { where: string; status: Status; detail: boolean }) {
  const parts = [
    where || "no repo yet",
    `step ${status.steps}`,
    `${Math.round(status.tokens / 1000)}k tokens`,
    money(status.cost),
  ];
  const tone = status.passed ? COLOR.pass : COLOR.fail;
  return (
    <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1} flexShrink={0}>
      <text fg={COLOR.quiet}>
        {parts.join("  │  ")}
        {status.check ? "  │  " : ""}
        <span fg={tone}>{status.check ? `tests: ${status.check}` : ""}</span>
      </text>
      <text fg={COLOR.quiet}>{detail ? "Ctrl+O less" : "Ctrl+O more"}</text>
    </box>
  );
}
