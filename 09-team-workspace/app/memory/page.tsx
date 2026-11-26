import Link from "next/link";
import { SettingsTabs } from "../../components/SettingsTabs";
import { Shell } from "../../components/Shell";
import { memoriesOf } from "../../db/memories";
import { chatsOf } from "../../db/queries";
import { knownNotice, MEMORY, MEMORY_REFUSALS } from "../../rules/memory";
import { editOneMemory, forgetMemory } from "../actions";
import { requireMember } from "../session";

type Memory = Awaited<ReturnType<typeof memoriesOf>>[number];

const saved = (date: Date) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function EditMemory({ memory }: { memory: Memory }) {
  return (
    <details className="memory-edit">
      <summary>Edit</summary>
      <form action={editOneMemory} className="memory-edit-form">
        <input type="hidden" name="id" value={memory.id} />
        <label className="sr-only" htmlFor={`memory-${memory.id}`}>
          Memory text
        </label>
        <textarea
          id={`memory-${memory.id}`}
          className="field"
          name="text"
          defaultValue={memory.text}
          maxLength={MEMORY.maxLength}
          rows={2}
          required
        />
        <button type="submit" className="button button-primary">
          Save
        </button>
      </form>
    </details>
  );
}

function MemoryRow({ memory }: { memory: Memory }) {
  return (
    <li className="memory-row">
      <div className="memory-text">
        <p>{memory.text}</p>
        <p className="memory-meta">
          Saved {saved(memory.createdAt)}
          {memory.chatId ? (
            <>
              , from <Link href={`/chat/${memory.chatId}`}>this chat</Link>
            </>
          ) : null}
        </p>
        <EditMemory memory={memory} />
      </div>
      <form action={forgetMemory}>
        <input type="hidden" name="id" value={memory.id} />
        <button type="submit" className="button button-quiet">
          Forget
        </button>
      </form>
    </li>
  );
}

// Everything the assistant keeps about this person, in plain words. Each one can be rewritten or forgotten here.
export default async function MemoryPage({ searchParams }: { searchParams: Promise<{ failed?: string }> }) {
  const member = await requireMember();
  const [memories, chats, { failed }] = await Promise.all([
    memoriesOf(member.id),
    chatsOf(member.id),
    searchParams,
  ]);
  return (
    <Shell person={{ name: member.name, role: member.role }} chats={chats}>
      <section className="page">
        <SettingsTabs current="/memory" />
        <p className="page-lede">
          The assistant reads these at the start of every chat. Only you see them. It keeps up to{" "}
          {MEMORY.perPerson}, and never a password, key or card number.
        </p>
        {knownNotice(failed, Object.values(MEMORY_REFUSALS)) ? (
          <p className="notice notice-fail" role="alert">
            {failed}
          </p>
        ) : null}
        {memories.length === 0 ? (
          <p className="empty-note">Nothing yet. Tell it something about you and your work in a chat.</p>
        ) : (
          <ul className="memory-list">
            {memories.map((memory) => (
              <MemoryRow key={memory.id} memory={memory} />
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}
