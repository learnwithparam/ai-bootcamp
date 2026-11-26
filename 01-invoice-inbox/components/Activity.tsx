import { Sparkles } from "lucide-react";

type Event = { id: string; at: Date; actor: string | null; text: string };

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

// Everything that happened to the bill, newest first. The assistant's lines carry its mark.
export function Activity({ events }: { events: Event[] }) {
  return (
    <section className="panel" aria-label="Activity">
      <div className="panel-head">
        <h2>Activity</h2>
      </div>
      <div className="panel-body">
        <ol className="timeline">
          {events.map((event) => (
            <li key={event.id} data-agent={event.actor ? undefined : ""}>
              <time dateTime={event.at.toISOString()}>{when.format(event.at)} UTC</time>
              <strong>
                {event.actor ?? (
                  <>
                    <Sparkles aria-hidden="true" /> Assistant
                  </>
                )}
              </strong>
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
