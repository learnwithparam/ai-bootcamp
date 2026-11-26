/** @jsxImportSource @opentui/react */
import { useKeyboard } from "@opentui/react";
import { useState, useSyncExternalStore } from "react";
import type { Terminal } from "../agent/agent";
import { type Start, submit } from "../agent/commands";
import { ANSWERS, answerForKey } from "../rules/answers";
import { COLOR } from "./colors";
import { type Key, useEditor } from "./editor";
import { InputBox } from "./InputBox";
import { Permission } from "./Permission";
import { StatusLine } from "./StatusLine";
import { Transcript } from "./Transcript";

// The whole screen: a header, the transcript, the permission prompt when one waits, the input box and the status line.
// One keyboard handler decides where each key goes, so a key never does two things at once.

export type AppProps = { terminal: Terminal; start: Start; quit: () => void };

function Header({ where }: { where: string }) {
  return (
    <box flexDirection="row" paddingLeft={1} flexShrink={0}>
      <text>
        <span bg={COLOR.mark} fg={COLOR.onMark}>
          <strong> Coding agent </strong>
        </span>
        <span fg={COLOR.quiet}>{where ? `  in ${where}` : ""}</span>
      </text>
    </box>
  );
}

// One keyboard handler for the whole screen. The prompt takes 1, 2, 3, y and n,
// or Up, Down and Enter on the highlighted answer. Every other key goes to the input box.
function useKeys({ terminal, start, quit }: AppProps, screen: ReturnType<Terminal["snapshot"]>) {
  const editor = useEditor();
  const [selected, setSelected] = useState(0);
  const answerKey = (key: Key) => {
    const direct = answerForKey(key.name);
    const chosen = key.name === "return" ? ANSWERS[selected]?.answer : direct;
    if (key.name === "up" || key.name === "down")
      setSelected((selected + (key.name === "up" ? ANSWERS.length - 1 : 1)) % ANSWERS.length);
    if (!chosen) return;
    setSelected(0);
    terminal.answer(chosen);
  };
  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") return quit();
    if (key.name === "escape") return terminal.stop();
    if (key.ctrl && key.name === "o") return terminal.set({ showDetail: !screen.showDetail });
    if (screen.asking) return answerKey(key);
    const line = editor.handle(key, screen.prompt?.hidden ?? false);
    if (line !== null) void submit(terminal, line, start, quit);
  });
  return { editor, selected };
}

export function App(props: AppProps) {
  const screen = useSyncExternalStore(props.terminal.subscribe, props.terminal.snapshot);
  const { editor, selected } = useKeys(props, screen);
  return (
    <box flexDirection="column" flexGrow={1}>
      <Header where={screen.where} />
      <Transcript
        items={screen.items}
        streaming={screen.streaming}
        working={screen.running && !screen.asking}
        showDetail={screen.showDetail}
      />
      {screen.asking ? <Permission request={screen.asking} selected={selected} /> : null}
      <InputBox
        text={editor.text}
        cursor={editor.cursor}
        label={screen.prompt?.label ?? null}
        hidden={screen.prompt?.hidden ?? false}
        busy={screen.running}
      />
      <StatusLine where={screen.where} status={screen.status} detail={screen.showDetail} />
    </box>
  );
}
