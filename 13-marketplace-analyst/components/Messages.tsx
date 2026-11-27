"use client";

import { ErrorPrimitive, MessagePrimitive, useAuiState } from "@assistant-ui/react";
import { MarkdownText } from "@bootcamp/ui/parts";
import type { AnalystData } from "../rules/parts";
import { ChartView } from "./Chart";
import { QueryCard } from "./QueryCard";
import { RouteMap } from "./RouteMap";

export function UserMessage() {
  return (
    <MessagePrimitive.Root className="turn-question">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function AnswerText() {
  return (
    <div className="answer-text">
      <MarkdownText />
    </div>
  );
}

type DataPart = { type: string; name?: string; data?: unknown };

function dataOf<Name extends keyof AnalystData>(parts: readonly DataPart[], name: Name) {
  return parts
    .filter((part) => part.type === "data" && part.name === name)
    .map((part) => part.data as AnalystData[Name]);
}

// One answer, laid out the same way every time: the route taken, the answer, its queries, its chart.
export function AssistantMessage() {
  const parts = useAuiState((state) => state.message.parts) as readonly DataPart[];
  const [timeline] = dataOf(parts, "timeline");
  const [chart] = dataOf(parts, "chart");
  return (
    <MessagePrimitive.Root className="turn-answer">
      {timeline ? <RouteMap timeline={timeline} /> : <p className="running">Reading the question...</p>}
      <MessagePrimitive.Parts components={{ Text: AnswerText }} />
      {dataOf(parts, "query").map((query) => (
        <QueryCard key={query.id} query={query} />
      ))}
      {chart ? <ChartView chart={chart} /> : null}
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root className="chat-error" role="alert">
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}
