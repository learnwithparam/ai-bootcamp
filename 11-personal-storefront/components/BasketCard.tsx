"use client";

import { ToolCallStatus, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import Image from "next/image";
import { type Proposal, ProposalSchema } from "../rules/basket";
import { pounds } from "../rules/catalog";

type CardProps = {
  args: Partial<Proposal>;
  status: ToolCallStatus;
  respond?: (result: unknown) => Promise<void>;
  result?: string;
};

const keyOf = (one: { code: string; why: string }) => [one.code, one.why].join(" ");

// The products the rules took out of the basket, folded away, with the reason for each.
function LeftOut({ removed }: { removed: NonNullable<Proposal["removed"]> }) {
  if (removed.length === 0) return null;
  return (
    <details>
      <summary>Left out: {removed.length}</summary>
      <ul className="left-out">
        {removed.map((one) => (
          <li key={keyOf(one)}>
            {one.name}: {one.why}
          </li>
        ))}
      </ul>
    </details>
  );
}

// Add all or No thanks while the agent waits, and what the shopper chose once it has its answer.
function Answer({
  answered,
  respond,
  result,
}: Pick<CardProps, "respond" | "result"> & { answered: boolean }) {
  return answered ? (
    <p className="basket-answer">
      {result?.includes("yes") ? "Added to your basket." : "Nothing was added."}
    </p>
  ) : (
    <div className="basket-buttons">
      <button
        type="button"
        className="button"
        disabled={!respond}
        onClick={() => respond?.({ answer: "yes" })}
      >
        Add all
      </button>
      <button
        type="button"
        className="button button-quiet"
        disabled={!respond}
        onClick={() => respond?.({ answer: "no" })}
      >
        No thanks
      </button>
    </div>
  );
}

// The basket the agent proposed, waiting for the shopper. Nothing is added until they press Add all,
// and then the server adds the basket it saved, not what this card shows.
function Card({ args, status, respond, result }: CardProps) {
  const lines = args.lines ?? [];
  const removed = args.removed ?? [];
  const answered = status === ToolCallStatus.Complete;
  return (
    <section className="basket-card" aria-label="Suggested basket">
      <h2>Your week, in one basket</h2>
      <ul className="basket-card-lines">
        {lines.map((line) => (
          <li key={line.code}>
            <Image src={line.image} alt="" width={36} height={36} />
            <span>
              {line.quantity} × {line.name}
            </span>
            <span>{pounds(line.quantity * line.pricePence)}</span>
          </li>
        ))}
      </ul>
      <p className="basket-total">
        Total <strong>{pounds(args.totalPence ?? 0)}</strong>
        {args.budgetPence ? ` of your ${pounds(args.budgetPence)} budget` : ""}
      </p>
      <LeftOut removed={removed} />
      <Answer answered={answered} respond={respond} result={result} />
    </section>
  );
}

// The page's one tool: the agent calls it to propose a basket, and the shopper's answer is the result.
export function useBasketTool() {
  useHumanInTheLoop({
    name: "proposeBasket",
    description: "Show the shopper a suggested basket and wait for them to add it or say no.",
    parameters: ProposalSchema,
    render: (props) => <Card {...(props as CardProps)} />,
  });
}
