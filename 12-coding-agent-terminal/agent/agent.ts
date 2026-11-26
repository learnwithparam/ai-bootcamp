import { runAgent } from "@bootcamp/coding-harness/agent/agent";
import type { AskRequest } from "@bootcamp/coding-harness/agent/call";
import { newSessionFile } from "@bootcamp/coding-harness/agent/session-file";
import type { Place } from "@bootcamp/coding-harness/agent/workspace";
import type { SessionEvent } from "@bootcamp/coding-harness/rules/session";
import { startTracing } from "@bootcamp/tracing";
import { type Answer, settleAnswer } from "../rules/answers";
import { EMPTY_STATUS, type Item, itemFor, type Status, statusAfter, type Tone } from "../rules/screen";

// The terminal app's state, and the one place that runs the harness. The screens in tui/ only read it.
// It is the same loop as `bun run code`, with three things a person at the keyboard adds:
// the model's words as they stream, a yes or no before a change, and Esc to stop.

export type Screen = {
  where: string;
  items: Item[];
  streaming: string;
  asking: AskRequest | null;
  status: Status;
  running: boolean;
  showDetail: boolean;
  prompt: { label: string; hidden: boolean } | null;
  session: string | null;
};

const START: Screen = {
  where: "",
  items: [],
  streaming: "",
  asking: null,
  status: EMPTY_STATUS,
  running: false,
  showDetail: false,
  prompt: null,
  session: null,
};

export class Terminal {
  private state: Screen;
  private listeners = new Set<() => void>();
  private nextId = 1;
  private waiting: ((yes: boolean) => void) | null = null;
  private stopper: AbortController | null = null;
  readonly allowed = new Set<string>();

  constructor(where: string) {
    this.state = { ...START, where };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  snapshot = (): Screen => this.state;

  set(change: Partial<Screen>): void {
    this.state = { ...this.state, ...change };
    for (const listener of this.listeners) listener();
  }

  note(tone: Tone, text: string): void {
    this.set({ items: [...this.state.items, { id: this.nextId++, tone, text }] });
  }

  // Every harness event goes to the session file first, then to the screen.
  show(event: SessionEvent): void {
    const item = itemFor(event);
    const streaming = event.type === "thought" || event.type === "usage" ? "" : this.state.streaming;
    this.set({
      items: item ? [...this.state.items, { id: this.nextId++, ...item }] : this.state.items,
      status: statusAfter(this.state.status, event),
      streaming,
    });
  }

  // The harness calls this before a change. "Always" answers it without asking again until you quit.
  ask = (request: AskRequest): Promise<boolean> => {
    if (this.allowed.has(request.key)) return Promise.resolve(true);
    this.set({ asking: request });
    return new Promise((resolve) => {
      this.waiting = resolve;
    });
  };

  answer(answer: Answer): void {
    const request = this.state.asking;
    if (!request || !this.waiting) return;
    const yes = settleAnswer(answer, request, this.allowed);
    this.waiting(yes);
    this.waiting = null;
    this.set({ asking: null });
  }

  // Esc. A prompt that is waiting is answered no, then the model call in flight is cancelled.
  stop(): void {
    if (!this.state.running) return;
    if (this.state.asking) this.answer("deny");
    this.stopper?.abort();
  }

  async run(task: string, place: Place, check: string): Promise<void> {
    if (this.state.running) return this.note("wait", "A run is going. Press Esc to stop it first.");
    startTracing();
    const session = newSessionFile();
    this.stopper = new AbortController();
    this.set({ running: true, where: place.name, status: EMPTY_STATUS, session: session.path });
    const record = (event: SessionEvent) => {
      session.write(event);
      this.show(event);
    };
    const live = {
      ask: this.ask,
      signal: this.stopper.signal,
      onText: (text: string) => this.set({ streaming: this.state.streaming + text }),
    };
    await runAgent({ task, ...place, check }, record, live).catch((error: Error) => {
      console.error(error);
      this.note("fail", `The run broke: ${error.message}`);
    });
    this.set({ running: false, asking: null, streaming: "" });
    this.note("quiet", "Saved this run. Type /upload to send it for review.");
  }
}
