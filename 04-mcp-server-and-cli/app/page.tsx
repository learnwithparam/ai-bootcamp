import { Topbar } from "@bootcamp/auth/topbar";
import { z } from "zod";
import { TOOLS } from "../agent/tools/all";
import { MCP_RESOURCE } from "../auth/auth";
import { Chat } from "../components/Chat";
import { Connect } from "../components/Connect";
import { type ToolInfo, ToolRunner } from "../components/ToolRunner";
import { maybeUser } from "./session";

// Each tool's form is built from its own input schema, so a new tool shows up here with no page change.
function describe(): ToolInfo[] {
  return TOOLS.map((tool) => {
    const schema = z.toJSONSchema(tool.input) as {
      properties?: Record<string, { enum?: string[] }>;
      required?: string[];
    };
    const fields = Object.entries(schema.properties ?? {}).map(([name, property]) => ({
      name,
      required: schema.required?.includes(name) ?? false,
      choices: property.enum ?? null,
    }));
    return { name: tool.name, description: tool.description, personal: tool.personal, fields };
  });
}

export default async function ToolsPage() {
  const user = await maybeUser();
  return (
    <div className="app">
      <Topbar title="learnwithparam tools" userName={user?.name} />
      <div className="workbench">
        <aside className="side">
          <ToolRunner tools={describe()} signedIn={Boolean(user)} />
          <Connect mcpUrl={MCP_RESOURCE} />
        </aside>
        <Chat />
      </div>
    </div>
  );
}
