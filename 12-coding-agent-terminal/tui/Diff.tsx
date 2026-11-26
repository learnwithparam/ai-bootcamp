/** @jsxImportSource @opentui/react */
import { COLOR } from "./colors";

// A change drawn line by line: + on green for a line added, - on red for a line taken out,
// and a dim · for a line that stays. The sign is always drawn, so the change still reads where colour does not show,
// and every line of code is marked as code, never mistaken for the model's words.

const MAX_LINES = 14;

export function Diff({ text }: { text: string }) {
  const body = text.split("\n").filter((line, index) => index > 2 && line !== "");
  const shown = body.slice(0, MAX_LINES);
  return (
    <box flexDirection="column">
      {shown.map((line, index) => {
        const sign = line[0] === "+" || line[0] === "-" ? line[0] : "·";
        const tone = sign === "+" ? COLOR.added : sign === "-" ? COLOR.removed : undefined;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: the same line can appear twice, and the order never changes
          <text key={index} bg={tone} fg={tone ? COLOR.you : COLOR.quiet}>
            {`${sign} ${line.slice(1)}`}
          </text>
        );
      })}
      {body.length > MAX_LINES ? (
        <text fg={COLOR.quiet}>{`... ${body.length - MAX_LINES} more lines`}</text>
      ) : null}
    </box>
  );
}
