import { Eye, Globe, Lock, PencilLine } from "lucide-react";
import Link from "next/link";
import { describeTools, type ToolInfo } from "../agent/tools/describe";
import { AskPanel } from "../components/AskPanel";
import { DevShell } from "../components/DevShell";
import { ToolDetail } from "../components/ToolDetail";
import { maybeUser } from "./session";

function Tags({ tool }: { tool: ToolInfo }) {
  return (
    <span className="tool-tags">
      <span>
        {tool.personal ? <Lock aria-hidden="true" /> : <Globe aria-hidden="true" />}
        {tool.personal ? "Needs sign-in" : "Public"}
      </span>
      <span>
        {tool.changesData ? <PencilLine aria-hidden="true" /> : <Eye aria-hidden="true" />}
        {tool.changesData ? "Changes data" : "Read-only"}
      </span>
    </span>
  );
}

function ToolList({ tools, current }: { tools: ToolInfo[]; current: string }) {
  return (
    <nav className="tool-list" aria-label="Tools">
      {tools.map((tool) => (
        <Link
          key={tool.name}
          href={`/?tool=${tool.name}`}
          className="tool-list-item"
          aria-current={tool.name === current ? "page" : undefined}
        >
          <strong>{tool.title}</strong>
          <code>{tool.name}</code>
          <Tags tool={tool} />
        </Link>
      ))}
    </nav>
  );
}

// The tools page. Each tool is listed from the one TOOLS list, and its form is built from its own schema.
export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ tool?: string }> }) {
  const user = await maybeUser();
  const tools = describeTools();
  const wanted = (await searchParams).tool;
  const tool = tools.find((each) => each.name === wanted) ?? tools[0];
  if (!tool) throw new Error("No tools are registered.");
  const titles = Object.fromEntries(tools.map((each) => [each.name, each.title]));
  return (
    <DevShell user={user} current="tools">
      <header className="page-header">
        <div>
          <h1>Tools</h1>
          <p>The same tools answer here, in Claude or Cursor over MCP, and in the terminal.</p>
        </div>
      </header>
      <div className="tools-split">
        <ToolList tools={tools} current={tool.name} />
        <ToolDetail key={tool.name} tool={tool} signedIn={Boolean(user)} />
      </div>
      <AskPanel signedIn={Boolean(user)} titles={titles} />
    </DevShell>
  );
}
