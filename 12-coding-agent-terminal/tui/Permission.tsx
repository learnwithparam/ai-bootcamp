/** @jsxImportSource @opentui/react */
import type { AskRequest } from "@bootcamp/coding-harness/agent/call";
import { ANSWERS } from "../rules/answers";
import { changeOf } from "../rules/diff";
import { COLOR } from "./colors";
import { Diff } from "./Diff";

// Before an edit, a write or a test run, the agent waits here for you, as Claude Code does.
// An edit shows its change first, so you say yes to what you have read.

export function Permission({ request, selected }: { request: AskRequest; selected: number }) {
  const change = changeOf(request.tool, request.input);
  return (
    <box
      border
      borderStyle="rounded"
      borderColor={COLOR.wait}
      title={` ${request.question} `}
      titleColor={COLOR.wait}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      flexShrink={0}
    >
      {change ? <Diff text={change.text} /> : null}
      {ANSWERS.map((each, index) => (
        <text key={each.answer} fg={index === selected ? COLOR.you : COLOR.quiet}>
          {index === selected ? (
            <strong>{`› ${each.key}. ${each.label(request)}`}</strong>
          ) : (
            `  ${each.key}. ${each.label(request)}`
          )}
        </text>
      ))}
      <text fg={COLOR.quiet}>Press 1, 2 or 3, or Up, Down and Enter. Esc stops the run.</text>
    </box>
  );
}
