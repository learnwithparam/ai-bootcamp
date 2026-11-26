"use client";

import { type UseSessionReturn, useSession } from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { AgentSessionProvider } from "./agents-ui/agent-session-provider";
import { AgentSessionView_01 } from "./agents-ui/session-view";
import { StartAudioButton } from "./agents-ui/start-audio-button";
import "./agents-ui/agents-ui.css";

// The caller's phone, on LiveKit's Agents UI from agent-starter-react: its session view, aura, transcript
// and control bar. The one change is where the pass comes from. The starter asks a token endpoint;
// here /api/call counts the call against the clinic's limits first, then hands over a pass to one room.

type Phase = "idle" | "calling" | "ended";
type OnEnd = (problem?: string) => void;
const LINE_DOWN = "The line could not connect. Please try again.";

type Pass = { serverUrl: string; participantToken: string };

// Asks the clinic for a pass. Each ask is counted as a call, so a Line asks once.
async function askForPass(blocked: RefObject<string | null>): Promise<Pass> {
  const response = await fetch("/api/call", { method: "POST", signal: AbortSignal.timeout(15_000) });
  const answer = (await response.json()) as { url?: string; token?: string; blocked?: string };
  if (!answer.url || !answer.token) {
    blocked.current = answer.blocked ?? LINE_DOWN;
    throw new Error(blocked.current);
  }
  return { serverUrl: answer.url, participantToken: answer.token };
}

// The pass to one room. The session asks for it more than once while it connects, and every ask
// gets the same pass. When the clinic refuses the call, its reason is kept to show the caller.
function useCallerPass() {
  const blocked = useRef<string | null>(null);
  const pass = useRef<Promise<Pass> | null>(null);
  const source = useMemo(
    () =>
      TokenSource.custom(() => {
        pass.current ??= askForPass(blocked);
        return pass.current;
      }),
    [],
  );
  return { source, blocked };
}

// Starts the call once with the microphone on, and reports when it ends or never connects.
function useCallLife(session: UseSessionReturn, blocked: RefObject<string | null>, onEnd: OnEnd) {
  const started = useRef(false);
  const wasLive = useRef(false);
  useEffect(() => {
    // React runs an effect twice in development. The guard keeps it to one call in the ledger.
    if (started.current) return;
    started.current = true;
    session.start({ tracks: { microphone: { enabled: true } } }).catch((error: unknown) => {
      if (!blocked.current) console.error("The call did not connect:", error);
      onEnd(blocked.current ?? LINE_DOWN);
    });
  }, [session, blocked, onEnd]);
  useEffect(() => {
    if (session.isConnected) wasLive.current = true;
    else if (wasLive.current) onEnd();
  }, [session.isConnected, onEnd]);
}

// One call from ringing to hang up. A new call is a new Line, so a used pass is never offered again.
function Line({ aura, onEnd }: { aura: `#${string}`; onEnd: OnEnd }) {
  const { source, blocked } = useCallerPass();
  const session = useSession(source);
  useCallLife(session, blocked, onEnd);
  return (
    <AgentSessionProvider session={session}>
      <AgentSessionView_01
        audioVisualizer={{ type: "aura", color: aura }}
        controls={{ leave: true, microphone: true, chat: true }}
        defaultChatOpen
        preConnectMessage="Connecting you to the front desk"
        themeMode="light"
        className="phone-session"
      />
      <StartAudioButton label="Turn on the sound" />
    </AgentSessionProvider>
  );
}

function Ready({ ended, problem, onCall }: { ended: boolean; problem: string | null; onCall: () => void }) {
  return (
    <div className="phone-ready">
      <p className="phone-number">Front desk</p>
      <p className="phone-status" aria-live="polite">
        {ended ? "Call ended" : "Ready to call"}
      </p>
      {problem && (
        <p className="phone-problem" role="alert">
          {problem}
        </p>
      )}
      <button type="button" className="button phone-call" onClick={onCall}>
        {ended ? "Call again" : "Call the clinic"}
      </button>
      <p className="phone-note">Uses your microphone. Calls end after five minutes.</p>
    </div>
  );
}

export function Phone() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [attempt, setAttempt] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [aura, setAura] = useState<`#${string}`>("#");
  const end = useMemo<OnEnd>(
    () => (blocked) => {
      setProblem(blocked ?? null);
      setPhase(blocked ? "idle" : "ended");
    },
    [],
  );
  function call() {
    // The aura is a shader, which takes a colour, not a CSS variable: it reads the clinic's from tokens.css.
    setAura(getComputedStyle(document.documentElement).getPropertyValue("--firm").trim() as `#${string}`);
    setProblem(null);
    setAttempt((n) => n + 1);
    setPhase("calling");
  }
  return (
    <section className="phone agents-ui" aria-label="Call the clinic" data-phase={phase}>
      {phase === "calling" ? (
        <Line key={attempt} aura={aura} onEnd={end} />
      ) : (
        <Ready ended={phase === "ended"} problem={problem} onCall={call} />
      )}
    </section>
  );
}
