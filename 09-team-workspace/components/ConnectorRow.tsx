import type { ReactNode } from "react";

type Action = (form: FormData) => Promise<void>;

function Button({ action, id, children }: { action: Action; id: string; children: ReactNode }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="button">
        {children}
      </button>
    </form>
  );
}

// One server the team may use. Each person connects with their own account, so its tools act as them.
export function ConnectorRow(props: {
  connector: { id: string; name: string; url: string };
  connected: boolean;
  actions: { connect: Action; disconnect: Action; remove?: Action };
}) {
  const { connector, connected, actions } = props;
  return (
    <li className="card card-body connector-row">
      <div>
        <strong>{connector.name}</strong>
        <span className={connected ? "status status-pass" : "status status-wait"}>
          {connected ? "connected" : "not connected"}
        </span>
        <p className="connector-url">{connector.url}</p>
      </div>
      <div className="connector-actions">
        {connected ? (
          <Button action={actions.disconnect} id={connector.id}>
            Disconnect
          </Button>
        ) : (
          <form action={actions.connect}>
            <input type="hidden" name="id" value={connector.id} />
            <button type="submit" className="button button-primary">
              Connect
            </button>
          </form>
        )}
        {actions.remove ? (
          <Button action={actions.remove} id={connector.id}>
            Remove for everyone
          </Button>
        ) : null}
      </div>
    </li>
  );
}
