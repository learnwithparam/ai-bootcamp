import { ConversationList } from "../../components/ConversationList";
import { ConversationPane } from "../../components/ConversationPane";
import { CustomerPanel } from "../../components/CustomerPanel";
import { InboxShell } from "../../components/InboxShell";
import { findPlan } from "../../db/billing";
import { costOf, messagesOf } from "../../db/conversations";
import { conversationById, inboxRows } from "../../db/inbox";
import { customerOf } from "../../db/queries";
import { isView, VIEWS, type View, viewsOf } from "../../rules/conversation";
import { requireSupport } from "../session";

export const dynamic = "force-dynamic";

type Search = { view?: string; id?: string };

async function planOf(userId: string | null) {
  const customerId = userId ? await customerOf(userId) : null;
  return customerId ? findPlan(customerId) : null;
}

async function Selected({ id, view }: { id: string; view: View }) {
  const conversation = await conversationById(id);
  if (!conversation) return <p className="inbox-empty">That conversation is not in the inbox.</p>;
  const [messages, cost, plan] = await Promise.all([messagesOf(id), costOf(id), planOf(conversation.userId)]);
  return (
    <>
      <ConversationPane conversation={conversation} messages={messages} view={view} />
      <CustomerPanel conversation={conversation} plan={plan} cost={cost} />
    </>
  );
}

// Only people on the support team see this page. Anyone else gets a plain not-found page.
export default async function InboxPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireSupport();
  const search = await searchParams;
  const view: View = isView(search.view) ? search.view : "waiting";
  const rows = await inboxRows();
  const counts = Object.fromEntries(Object.keys(VIEWS).map((key) => [key, 0])) as Record<View, number>;
  for (const row of rows) for (const each of viewsOf(row, user.id)) counts[each] += 1;
  const listed = rows.filter((row) => viewsOf(row, user.id).includes(view));
  const selected = search.id ?? null;
  return (
    <InboxShell name={user.name} current={view} counts={counts}>
      <div className={selected ? "inbox-panes has-selection" : "inbox-panes"}>
        <ConversationList rows={listed} view={view} selected={selected} />
        {selected ? (
          <Selected id={selected} view={view} />
        ) : (
          <p className="inbox-pick">Pick a conversation to read it and reply.</p>
        )}
      </div>
    </InboxShell>
  );
}
