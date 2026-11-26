import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PRODUCTS } from "@bootcamp/products";
import { $ } from "bun";

// bun run setup: everything a fresh clone needs, in order. Safe to run again.

const ENV_FILE = ".env";

function step(name: string) {
  console.log(`\n== ${name}`);
}

function secret(bytes: number) {
  return randomBytes(bytes).toString("hex");
}

// Fills blank generated values in .env. Keys you type yourself are never touched.
function writeEnvFile() {
  const text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : readFileSync(".env.example", "utf8");
  const publicKey = `pk-lf-${secret(8)}`;
  const secretKey = `sk-lf-${secret(8)}`;
  const generated: Record<string, string> = {
    BETTER_AUTH_SECRET: secret(32),
    LANGFUSE_PUBLIC_KEY: publicKey,
    LANGFUSE_SECRET_KEY: secretKey,
    LANGFUSE_INIT_PROJECT_PUBLIC_KEY: publicKey,
    LANGFUSE_INIT_PROJECT_SECRET_KEY: secretKey,
    LANGFUSE_INIT_USER_PASSWORD: secret(8),
  };
  const filled = text.replace(/^([A-Z_]+)=$/gm, (line, name: string) =>
    generated[name] ? `${name}=${generated[name]}` : line,
  );
  writeFileSync(ENV_FILE, filled);
  return filled;
}

function checkModelKey(text: string) {
  const value = (name: string) => new RegExp(`^${name}=(.+)$`, "m").exec(text)?.[1]?.trim();
  const provider = value("MODEL")?.split(":")[0];
  const key = provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENROUTER_API_KEY";
  if (!value(key)) {
    console.error(`\nAdd your ${key} to .env, then run \`bun run setup\` again.`);
    process.exit(1);
  }
  if (!value("OPENROUTER_API_KEY")) {
    console.error("\nThe decision model runs on OpenRouter: add OPENROUTER_API_KEY to .env too.");
    process.exit(1);
  }
}

// Langfuse creates the project from the keys in .env on its first start. This proves the keys open it.
async function checkLangfuse() {
  const env = parseEnv(readFileSync(ENV_FILE, "utf8"));
  await waitForLangfuse(`${env.LANGFUSE_BASE_URL}/api/public/health`);
  const login = btoa(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`);
  const response = await fetch(`${env.LANGFUSE_BASE_URL}/api/public/projects`, {
    headers: { Authorization: `Basic ${login}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `Langfuse refused the keys in .env (${response.status}). Run \`docker compose logs langfuse-web\`.`,
    );
  }
  console.log("Langfuse: ok");
}

// Docker reports Langfuse as started a little before it answers. Wait up to two minutes.
async function waitForLangfuse(url: string) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) }).catch(() => undefined);
    if (response?.ok) return;
    await Bun.sleep(2_000);
  }
  throw new Error(`Langfuse did not start at ${url}. Run \`docker compose logs langfuse-web\`.`);
}

function parseEnv(text: string): Record<string, string> {
  return Object.fromEntries([...text.matchAll(/^([A-Z_]+)=(.*)$/gm)].map(([, name, value]) => [name, value]));
}

step("Writing .env");
checkModelKey(writeEnvFile());

step("Starting Postgres and Langfuse (first run downloads the images)");
await $`docker compose up -d --wait`;

step("Checking the Langfuse keys");
await checkLangfuse();

step("Creating the tables");
await $`bun scripts/migrate.ts`;

for (const product of PRODUCTS) {
  step(`Setting up ${product.title}`);
  await $`bun run --cwd ${product.folder} setup`;
}

console.log("\nDone. Run `bun run dev` and open http://localhost:3100");
