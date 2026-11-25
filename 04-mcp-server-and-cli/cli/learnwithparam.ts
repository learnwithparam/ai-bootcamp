#!/usr/bin/env bun
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { accessToken, login } from "./login";
import { forgetTokens } from "./tokens";

// The learnwithparam CLI. It is an MCP client: every command after `login` is a call to the same tools
// that the web page and Claude use. A tool `upcoming_sessions` is the command `upcoming-sessions`.

const HELP = `Usage:
  learnwithparam login                      sign in through your browser
  learnwithparam logout                     forget your tokens on this computer
  learnwithparam tools                      list the tools
  learnwithparam <tool> [value] [--name value]
Example: learnwithparam search-catalog "rag evals" --kind lab`;

function serverAddress(): string {
  const server = process.env.MCP_SERVER_URL;
  if (!server)
    throw new Error("MCP_SERVER_URL is not set. Run the CLI from the repo root with `bun run cli`.");
  return server.replace(/\/$/, "");
}

async function connect(server: string): Promise<Client> {
  const token = (await accessToken(server)) ?? (await login(server));
  const client = new Client(
    { name: "learnwithparam-cli", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  const headers = { Authorization: `Bearer ${token}` };
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${server}/mcp`), { requestInit: { headers } }),
  );
  return client;
}

// `"rag evals" --kind lab` becomes { query: "rag evals", kind: "lab" }: a bare value fills the first required field.
export function toInput(args: string[], firstRequired: string | undefined): Record<string, string> {
  const input: Record<string, string> = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index] ?? "";
    if (arg.startsWith("--")) input[arg.slice(2)] = args[++index] ?? "";
    else if (firstRequired) input[firstRequired] = arg;
  }
  return input;
}

async function runTool(client: Client, command: string, args: string[]) {
  const { tools } = await client.listTools();
  const tool = tools.find((each) => each.name === command.replaceAll("-", "_"));
  if (!tool) throw new Error(`No command "${command}". Run \`learnwithparam tools\` to see them.`);
  const result = await client.callTool({
    name: tool.name,
    arguments: toInput(args, tool.inputSchema.required?.[0]),
  });
  for (const part of result.content) if (part.type === "text") console.log(part.text);
  if (result.isError) process.exitCode = 1;
}

async function main([command, ...args]: string[]) {
  if (!command || command === "help" || command === "--help") return console.log(HELP);
  const server = serverAddress();
  if (command === "logout") return forgetTokens().then(() => console.log("Signed out on this computer."));
  if (command === "login") return login(server).then(() => console.log("Signed in."));
  const client = await connect(server);
  if (command === "tools") {
    const { tools } = await client.listTools();
    for (const tool of tools) console.log(`${tool.name.replaceAll("_", "-").padEnd(20)} ${tool.description}`);
  } else await runTool(client, command, args);
  await client.close();
}

if (import.meta.main) {
  await main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
