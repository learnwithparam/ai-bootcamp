import type { ConversationRecord as Conversation } from "../rules/conversation";
import { formatPrice, type Plan } from "../rules/price";

type Props = {
  conversation: Conversation;
  plan: Plan | null;
  cost: { answers: number; costUsd: number };
};

const SITE = "https://www.learnwithparam.com";

// Who the teammate is talking to, read from the account and Stripe, never from what the visitor typed.
export function CustomerPanel({ conversation, plan, cost }: Props) {
  const signedIn = Boolean(conversation.userId);
  return (
    <aside className="customer-panel" aria-label="About this visitor">
      <h2>{conversation.name ?? "Guest"}</h2>
      <dl className="facts">
        <dt>Email</dt>
        <dd>{conversation.email ?? "Not given"}</dd>
        <dt>Account</dt>
        <dd>{signedIn ? "Signed in" : "Guest, not signed in"}</dd>
        <dt>Plan</dt>
        <dd>
          {plan
            ? `${plan.name}, ${formatPrice(plan.amountCents, plan.currency, plan.interval)}`
            : "No paid plan"}
        </dd>
        {plan ? (
          <>
            <dt>{plan.endsAtRenewal ? "Ends" : "Renews"}</dt>
            <dd>{plan.renewsOn}</dd>
          </>
        ) : null}
        <dt>Started on</dt>
        <dd>
          <a href={`${SITE}${conversation.startedOn}`} target="_blank" rel="noreferrer">
            {conversation.startedOn === "/" ? "Home page" : conversation.startedOn}
          </a>
        </dd>
        <dt>Assistant</dt>
        <dd>
          {cost.answers} {cost.answers === 1 ? "answer" : "answers"}, ${cost.costUsd.toFixed(4)}
        </dd>
      </dl>
    </aside>
  );
}
