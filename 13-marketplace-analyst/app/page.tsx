import { randomUUID } from "node:crypto";
import type { AnalystMessage } from "../agent/converse";
import { Analyst } from "../components/Analyst";
import { Shell } from "../components/Shell";
import { listConversations, messagesOf } from "../db/queries";
import { requireUser } from "./session";

type Search = { c?: string };

// One chat, with the person's earlier chats down the side. An id that is not theirs opens as a new one.
export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const { c } = await searchParams;
  const history = await listConversations(user.id);
  const open = history.find((each) => each.id === c);
  const messages = open ? await messagesOf(open.id, user.id) : [];
  const id = open?.id ?? randomUUID();
  return (
    <Shell userName={user.name} history={history} current={open?.id ?? "new"}>
      <Analyst key={id} id={id} start={messages as unknown as AnalystMessage[]} />
    </Shell>
  );
}
