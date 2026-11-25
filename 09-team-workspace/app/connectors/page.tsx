import { AddConnector } from "../../components/AddConnector";
import { ConnectorRow } from "../../components/ConnectorRow";
import { Shell } from "../../components/Shell";
import { allConnectors, connectedIds } from "../../db/connectors";
import { chatsOf } from "../../db/queries";
import { addConnectorForTeam, connect, disconnectConnector, removeConnectorForTeam } from "../actions";
import { requireMember } from "../session";

type Notice = { failed?: string; connected?: string; added?: string };

function NoticeLine({ notice }: { notice: Notice }) {
  if (notice.failed)
    return (
      <p className="card card-body chat-error" role="alert">
        {notice.failed}
      </p>
    );
  const text = notice.connected
    ? `${notice.connected}: connected. Its tools are in your next reply.`
    : notice.added && `${notice.added} was added. Press Connect to sign in to it.`;
  return text ? <p className="card card-body notice-pass">{text}</p> : null;
}

// The MCP servers the team may use. An admin adds them once; each person connects with their own account.
export default async function ConnectorsPage({ searchParams }: { searchParams: Promise<Notice> }) {
  const member = await requireMember();
  const [connectors, mine] = await Promise.all([allConnectors(), connectedIds(member.id)]);
  const isAdmin = member.role === "admin";
  const actions = {
    connect,
    disconnect: disconnectConnector,
    ...(isAdmin ? { remove: removeConnectorForTeam } : {}),
  };
  return (
    <Shell userName={member.name} chats={await chatsOf(member.id)}>
      <section className="page">
        <h1>Connectors</h1>
        <p>
          Other services' tools the assistant can use for you. A tool that changes something asks you first.
        </p>
        <NoticeLine notice={await searchParams} />
        {connectors.length === 0 ? (
          <p className="card card-body">No connectors yet. An admin adds them.</p>
        ) : null}
        <ul className="connector-list">
          {connectors.map((connector) => (
            <ConnectorRow
              key={connector.id}
              connector={connector}
              connected={mine.includes(connector.id)}
              actions={actions}
            />
          ))}
        </ul>
        {isAdmin ? <AddConnector action={addConnectorForTeam} /> : null}
      </section>
    </Shell>
  );
}
