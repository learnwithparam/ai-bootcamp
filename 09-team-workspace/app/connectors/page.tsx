import { AddConnector } from "../../components/AddConnector";
import { ConnectorRow } from "../../components/ConnectorRow";
import { SettingsTabs } from "../../components/SettingsTabs";
import { Shell } from "../../components/Shell";
import { allConnectors, connectedIds } from "../../db/connectors";
import { chatsOf } from "../../db/queries";
import { addConnectorForTeam, connect, disconnectConnector, removeConnectorForTeam } from "../actions";
import { requireMember } from "../session";

type Notice = { failed?: string; connected?: string; added?: string };

function NoticeLine({ notice }: { notice: Notice }) {
  if (notice.failed)
    return (
      <p className="notice notice-fail" role="alert">
        {notice.failed}
      </p>
    );
  const text = notice.connected
    ? `${notice.connected}: connected. Its tools are in your next reply.`
    : notice.added && `${notice.added} was added. Press Connect to sign in to it.`;
  return text ? <p className="notice notice-pass">{text}</p> : null;
}

type ListProps = { connectors: Awaited<ReturnType<typeof allConnectors>>; mine: string[]; isAdmin: boolean };

function ConnectorList({ connectors, mine, isAdmin }: ListProps) {
  const actions = {
    connect,
    disconnect: disconnectConnector,
    ...(isAdmin ? { remove: removeConnectorForTeam } : {}),
  };
  return connectors.length === 0 ? (
    <p className="empty-note">
      {isAdmin
        ? "No connectors yet. Add the first one below."
        : "No connectors yet. An admin adds them for the team."}
    </p>
  ) : (
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
  );
}

// The MCP servers the team may use. An admin adds them once; each person connects with their own account.
export default async function ConnectorsPage({ searchParams }: { searchParams: Promise<Notice> }) {
  const member = await requireMember();
  const [connectors, mine] = await Promise.all([allConnectors(), connectedIds(member.id)]);
  const isAdmin = member.role === "admin";
  return (
    <Shell person={{ name: member.name, role: member.role }} chats={await chatsOf(member.id)}>
      <section className="page">
        <SettingsTabs current="/connectors" />
        <p className="page-lede">
          Connect a service so the assistant can use its tools as you. Reading runs on its own. Anything that
          changes something asks you first, in the chat.
        </p>
        <NoticeLine notice={await searchParams} />
        <ConnectorList connectors={connectors} mine={mine} isAdmin={isAdmin} />
        {isAdmin ? <AddConnector action={addConnectorForTeam} /> : null}
      </section>
    </Shell>
  );
}
