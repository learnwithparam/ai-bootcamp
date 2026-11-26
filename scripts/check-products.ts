import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PRODUCTS, type Product } from "@bootcamp/products";

// Each product is a complete learner page plus the code it describes.
// This check fails when a page section, a screenshot, a test or a file in the reading list is missing,
// and when the root README's product table drifts from packages/products/products.ts.

export const SECTIONS = [
  "Why",
  "Goal",
  "Who uses it",
  "Before you start",
  "Run it",
  "What you will see",
  "How it works",
  "Try these",
  "Read the code",
  "Prove it",
  "Learn the idea in depth",
];

const REQUIRED_FILES = [
  "README.md",
  "package.json",
  "tests/rules.test.ts",
  "tests/agent.test.ts",
  "tests/e2e.test.ts",
];

function section(readme: string, title: string): string {
  const start = readme.indexOf(`\n## ${title}\n`);
  if (start < 0) return "";
  const next = readme.indexOf("\n## ", start + 4);
  return readme.slice(start, next < 0 ? undefined : next);
}

function checkReadme(product: Product): string[] {
  const path = join(product.folder, "README.md");
  if (!existsSync(path)) return [];
  const readme = readFileSync(path, "utf8");
  const problems = SECTIONS.filter((title) => !section(readme, title)).map(
    (title) => `${path}: missing the section "## ${title}".`,
  );
  if (!section(readme, "Try these").includes("Expect:")) {
    problems.push(`${path}: each prompt in "Try these" needs an Expect: line.`);
  }
  for (const [, image] of readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    if (image && !existsSync(join(product.folder, image)))
      problems.push(`${path}: image ${image} does not exist.`);
  }
  if (!/!\[[^\]]*\]\(screenshots\//.test(section(readme, "What you will see"))) {
    problems.push(`${path}: "What you will see" needs a real screenshot from screenshots/.`);
  }
  // The reading list names files as `agent/agent.ts` or `agent/agent.ts:12`.
  for (const [, file] of section(readme, "Read the code").matchAll(
    /`([\w./-]+\.(?:ts|tsx|md|css))(?::\d+)?`/g,
  )) {
    if (file && !existsSync(join(product.folder, file)))
      problems.push(`${path}: reading list names ${file}, which does not exist.`);
  }
  return problems;
}

// The browser test runs checkPage on the screens it reaches, so raw markdown, a raw tool id
// or an accessibility problem on a page fails proof.
function checkE2e(product: Product): string[] {
  const path = join(product.folder, "tests/e2e.test.ts");
  if (!existsSync(path) || readFileSync(path, "utf8").includes("await checkPage(")) return [];
  return [`${path}: call checkPage(page) from @bootcamp/ui/check-page on each screen it reaches.`];
}

function checkProduct(product: Product): string[] {
  if (!existsSync(product.folder))
    return [`${product.folder}: listed in products.ts but the folder is missing.`];
  const required = [...REQUIRED_FILES, product.agent ?? "agent/agent.ts"];
  const missing = required.filter((file) => !existsSync(join(product.folder, file)));
  return [
    ...missing.map((file) => `${product.folder}: missing ${file}.`),
    ...checkReadme(product),
    ...checkE2e(product),
  ];
}

function unlistedFolders(): string[] {
  const listed = new Set(PRODUCTS.map((product) => product.folder));
  return readdirSync(".")
    .filter((name) => /^\d\d-/.test(name) && name !== "00-setup" && !listed.has(name))
    .map((name) => `${name}: a product folder that is not in packages/products/products.ts.`);
}

const TABLE_START = "<!-- products:start -->";
const TABLE_END = "<!-- products:end -->";

export function productTable(): string {
  const rows = PRODUCTS.map(
    (product) =>
      `| ${Number(product.folder.slice(0, 2))} | [${product.title}](${product.folder}/README.md) | ${product.job} | ${product.ideas.join(", ")} |`,
  );
  return [
    TABLE_START,
    "| # | Product | The job it does | Ideas it shows |",
    "|---|---|---|---|",
    ...rows,
    TABLE_END,
  ].join("\n");
}

function checkRootTable(write: boolean): string[] {
  const readme = readFileSync("README.md", "utf8");
  const pattern = new RegExp(`${TABLE_START}[\\s\\S]*?${TABLE_END}`);
  if (!pattern.test(readme)) return [`README.md: add the ${TABLE_START} ... ${TABLE_END} block.`];
  const current = readme.replace(pattern, productTable());
  if (current === readme) return [];
  if (write) {
    writeFileSync("README.md", current);
    return [];
  }
  return ["README.md: the product table is out of date. Run `bun scripts/check-products.ts --write`."];
}

export function checkProducts(write = false): string[] {
  return [...PRODUCTS.flatMap(checkProduct), ...unlistedFolders(), ...checkRootTable(write)];
}

if (import.meta.main) {
  const problems = checkProducts(process.argv.includes("--write"));
  for (const problem of problems) console.error(problem);
  console.log(problems.length ? `\n${problems.length} product problems.` : "Products: ok");
  process.exit(problems.length ? 1 : 0);
}
