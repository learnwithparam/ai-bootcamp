// What every report covers. The graph starts one researcher per topic, all at the same time.
// Add a topic here and the graph, the report page and the tests pick it up with no other change.

export type Topic = { id: string; title: string; question: string };

export const TOPICS: Topic[] = [
  {
    id: "product",
    title: "What they sell",
    question: "What does the company sell, to whom, and how does it charge?",
  },
  {
    id: "size",
    title: "Size and funding",
    question: "How many people work there, and how much money has it raised, in which rounds and when?",
  },
  {
    id: "hiring",
    title: "Hiring",
    question: "Is the company hiring engineers now? Which roles, and how many?",
  },
  {
    id: "ai",
    title: "Use of AI",
    question: "Does the company build AI into its product or its engineering work? What exactly?",
  },
];

export function topicNamed(id: string): Topic {
  const topic = TOPICS.find((each) => each.id === id);
  if (!topic) throw new Error(`No topic called "${id}".`);
  return topic;
}
