type Input = { name: string; label: string; type?: string; placeholder?: string };

const INPUTS: Input[] = [
  { name: "name", label: "Name", placeholder: "learnwithparam" },
  { name: "url", label: "MCP server address", type: "url", placeholder: "https://example.com/mcp" },
  { name: "clientId", label: "Client id" },
  { name: "clientSecret", label: "Client secret", type: "password" },
];

// The form an admin fills in once, for the whole team. The id and secret come from the server's own admin.
export function AddConnector({ action }: { action: (form: FormData) => Promise<void> }) {
  return (
    <form action={action} className="card card-body add-connector">
      <h2>Add a connector for the team</h2>
      <p>The server's admin registers this workspace as an app and gives you its client id and secret.</p>
      {INPUTS.map((input) => (
        <label key={input.name} className="field-label">
          {input.label}
          <input
            className="field"
            name={input.name}
            type={input.type ?? "text"}
            placeholder={input.placeholder}
            autoComplete="off"
            required
          />
        </label>
      ))}
      <button type="submit" className="button button-primary">
        Add connector
      </button>
    </form>
  );
}
