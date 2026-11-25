import { Shell } from "../../components/Shell";
import { memoriesOf } from "../../db/memories";
import { chatsOf } from "../../db/queries";
import { MEMORY } from "../../rules/memory";
import { forgetMemory } from "../actions";
import { requireMember } from "../session";

// Everything the assistant keeps about this person, in plain words. Each one can be forgotten here.
export default async function MemoryPage() {
  const member = await requireMember();
  const memories = await memoriesOf(member.id);
  return (
    <Shell userName={member.name} chats={await chatsOf(member.id)}>
      <section className="page">
        <h1>What it remembers about you</h1>
        <p>
          The assistant reads these at the start of every chat. Only you see them. It keeps up to{" "}
          {MEMORY.perPerson}.
        </p>
        {memories.length === 0 ? (
          <p className="card card-body">Nothing yet. Tell it something about you and your work in a chat.</p>
        ) : (
          <ul className="memory-list">
            {memories.map((memory) => (
              <li key={memory.id} className="card card-body memory-row">
                <span>{memory.text}</span>
                <form action={forgetMemory}>
                  <input type="hidden" name="id" value={memory.id} />
                  <button type="submit" className="button">
                    Forget
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}
