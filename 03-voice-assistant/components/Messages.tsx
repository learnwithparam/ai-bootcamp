import { messageDone } from "../app/desk/actions";
import { spokenPhone } from "../rules/hold";
import { callTime } from "./when";

export type MessageRow = {
  id: string;
  callerName: string;
  phone: string;
  note: string;
  callId: string | null;
  createdAt: Date;
};

// The callers the phone could not help, waiting for a person to ring them back.
export function Messages({ messages, now }: { messages: MessageRow[]; now: Date }) {
  if (messages.length === 0) return <p className="empty-state">No one is waiting for a call back.</p>;
  return (
    <ul className="messages">
      {messages.map((message) => (
        <li key={message.id} className="message">
          <p className="message-who">
            {message.callerName}, {spokenPhone(message.phone)}
          </p>
          <p className="message-note">{message.note}</p>
          <p className="message-when">
            {message.callId ? (
              <a href={`/desk/calls/${message.callId}`}>{callTime(message.createdAt, now)}</a>
            ) : (
              callTime(message.createdAt, now)
            )}
          </p>
          <form action={messageDone.bind(null, message.id)}>
            <button type="submit" className="button button-quiet">
              Called back
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
