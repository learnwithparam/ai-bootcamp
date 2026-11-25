type Ticket = {
  id: number;
  email: string;
  summary: string;
  conversation: { role: string; text: string }[];
  openedAt: Date;
};

// Each ticket carries the whole conversation, so nobody asks the visitor to repeat themselves.
function TicketCard({ ticket, answer }: { ticket: Ticket; answer: (form: FormData) => Promise<void> }) {
  return (
    <li className="card">
      <div className="card-head">
        <span className="label">Ticket {ticket.id}</span>
        <a href={`mailto:${ticket.email}`}>{ticket.email}</a>
        <span>{ticket.openedAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
      </div>
      <div className="card-body">
        <p className="ticket-summary">{ticket.summary}</p>
        <details>
          <summary>The conversation</summary>
          <ol className="transcript">
            {ticket.conversation.map((turn, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: turns have no id and a transcript never reorders.
              <li key={index}>
                <strong>{turn.role === "user" ? "Visitor" : "Assistant"}:</strong> {turn.text}
              </li>
            ))}
          </ol>
        </details>
        <form action={answer}>
          <input type="hidden" name="ticket" value={ticket.id} />
          <button type="submit" className="button button-primary">
            Mark answered
          </button>
        </form>
      </div>
    </li>
  );
}

// Oldest first, because those visitors have waited longest.
export function SupportQueue({
  tickets,
  answer,
}: {
  tickets: Ticket[];
  answer: (form: FormData) => Promise<void>;
}) {
  if (tickets.length === 0) {
    return <p className="empty-queue">No open tickets. Every hand-off has an answer.</p>;
  }
  return (
    <ul className="tickets">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} answer={answer} />
      ))}
    </ul>
  );
}
