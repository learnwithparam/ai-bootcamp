"use client";

import { useAgent, useCopilotKit, useRenderToolCall } from "@copilotkit/react-core/v2";
import { useState } from "react";
import { pounds } from "../rules/catalog";
import type { Profile } from "../rules/profile";
import type { ShopState } from "../rules/state";
import { visibleSections } from "../rules/view";
import { AskBox } from "./AskBox";
import { useBasketTool } from "./BasketCard";
import { ProfileChips } from "./ProfileChips";
import { SignOut } from "./SignOut";
import { SectionView } from "./sections/Sections";

type Msg = {
  id: string;
  role: string;
  content?: unknown;
  toolCalls?: { id: string; function: { name: string } }[];
  toolCallId?: string;
};
const REBUILD = "Lay out my page again for what you know about me now.";

// The newest assistant words, and the newest basket the agent proposed, with the shopper's answer if any.
function lastOf(messages: Msg[]) {
  const reply = messages.findLast(
    (one) => one.role === "assistant" && typeof one.content === "string" && one.content,
  );
  const asking = messages.findLast((one) => one.role === "assistant" && one.toolCalls?.length);
  const call = asking?.toolCalls?.at(-1);
  const answer = call && messages.find((one) => one.role === "tool" && one.toolCallId === call.id);
  return { reply: reply?.content as string | undefined, call, answer };
}

type Account = { name: string | null; signedIn: boolean };

// The shop's own bar: the name, the basket with what is in it, and who is signed in.
function StoreTop({ account, basket }: { account: Account; basket: ShopState["basket"] }) {
  return (
    <header className="store-top">
      <h1 className="wordmark">
        <a href="/">Fernhill Grocer</a>
      </h1>
      <a className="basket-link" href="/basket">
        Basket {basket.count > 0 ? `${basket.count} · ${pounds(basket.totalPence)}` : "is empty"}
      </a>
      {account.signedIn ? (
        <span className="who">
          {account.name} <SignOut />
        </span>
      ) : (
        <a href="/sign-in">Sign in</a>
      )}
    </header>
  );
}

// Sends the conversation to the shop's agent. A sentence the route chose for the shopper is shown as it is.
async function runShop(agent: unknown, copilotkit: ReturnType<typeof useCopilotKit>["copilotkit"]) {
  try {
    // react-core and core each link their own @ag-ui/client copy, so the same agent has two type names here.
    await copilotkit.runAgent({ agent: agent as Parameters<typeof copilotkit.runAgent>[0]["agent"] });
    return null;
  } catch (error) {
    console.error("The run failed.", error);
    return error instanceof Error && error.message.endsWith(".")
      ? error.message
      : "Your page could not be changed just now. Try again in a moment.";
  }
}

// The shop's agent and what the page needs from it. Its state is shared: the route streams changes into it,
// and a chip the shopper edits goes back to the agent on the next ask.
function useShop() {
  const { agent } = useAgent({ agentId: "shop" });
  const { copilotkit } = useCopilotKit();
  useBasketTool();
  const state = agent.state as ShopState;
  const [edited, setEdited] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const running = agent.isRunning;

  async function ask(text: string) {
    setProblem(null);
    setEdited(false);
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content: text });
    setProblem(await runShop(agent, copilotkit));
  }
  const setProfile = (profile: Profile) => {
    agent.setState({ ...state, profile });
    setEdited(true);
  };
  const onAdded = (basket: ShopState["basket"]) => agent.setState({ ...(agent.state as ShopState), basket });
  return { state, running, ask, setProfile, onAdded, edited, problem, ...lastOf(agent.messages as Msg[]) };
}

// One line under the ask box: what the shop is doing, its reply, or what went wrong.
function Said({ text, problem }: { text: string | null | undefined; problem: boolean }) {
  if (!text) return null;
  return (
    <p className={problem ? "said problem" : "said"} role="status">
      {text}
    </p>
  );
}

export function Shop({ account }: { account: Account }) {
  const { state, running, ask, setProfile, onAdded, edited, problem, reply, call, answer } = useShop();
  const renderToolCall = useRenderToolCall();
  const [aisle, setAisle] = useState<string | null>(null);
  const sections = visibleSections(state.sections, state.profile, aisle);

  return (
    <div className="store">
      <StoreTop account={account} basket={state.basket} />
      <div className="store-body">
        <aside className="tailor">
          <AskBox running={running} onAsk={ask} />
          <Said text={problem ?? state.working ?? reply} problem={Boolean(problem)} />
          {call && renderToolCall({ toolCall: call as never, toolMessage: answer as never })}
          <ProfileChips
            profile={state.profile}
            edited={edited}
            running={running}
            onChange={setProfile}
            onRebuild={() => ask(REBUILD)}
          />
        </aside>
        <main className="page" aria-busy={running}>
          {sections.map((section) => (
            <SectionView
              key={section.id}
              section={section}
              onAdded={onAdded}
              picked={aisle}
              onPick={setAisle}
            />
          ))}
        </main>
      </div>
    </div>
  );
}
