import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { PRODUCTS } from "@bootcamp/products";
import ts from "typescript";
import { checkSelects, checkTextBoxes } from "./check-controls";

// Keeps the code easy to read and to navigate. Each rule names the failure it stops.

const MAX_FILE_LINES = 200;
const MAX_FUNCTION_LINES = 40;
const TOKENS_FILE = "packages/ui/tokens.css";
const SKIP = new Set(["node_modules", ".next", "screenshots", "migrations"]);
const CODE = /\.(ts|tsx)$/;
// LiveKit's Agents UI, copied from agent-starter-react as its registry ships it. Held to our size and colour
// rules, every update from LiveKit would become a hand merge, so those two rules skip it. The rest still apply.
const VENDORED = /\/components\/agents-ui\//;

// What each part of a product may import. rules/ never sees the model, so it reads and tests without AI.
const FORBIDDEN_IMPORTS: Record<string, RegExp[]> = {
  rules: [/^ai$/, /^@ai-sdk\//, /^@openrouter\//, /^@bootcamp\/model/, /\/(agent|app|components)\//],
  db: [/^ai$/, /^@bootcamp\/model/, /\/(agent|app|components)\//],
  agent: [/\/(app|components)\//],
  components: [/\/db\//, /^@bootcamp\/db/],
};

// Names that mean a faked flow. The repo shows products that really run.
const FAKE = /\b(MockLanguageModel\w*|simulateReadableStream|@faker-js|faker\.)/;
// AI SDK 7 deprecated the stream helpers on a streamText result. The next major removes them.
const DEPRECATED =
  /\.(toUIMessageStreamResponse|toUIMessageStream|pipeUIMessageStreamToResponse|toTextStreamResponse)\(/;

export type Problem = string;

// What may sit at the top of a product folder: the shared shape, then the few parts one product adds
// (auth and cli in 04, sample-invoices in 01, extensions in 10, tui in 12). A stray script here is a leftover, not a lesson.
const TOP_LEVEL = new Set([
  ...[
    "README.md",
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "next-env.d.ts",
    "drizzle.config.ts",
    "postcss.config.mjs",
  ],
  ...[
    "instrumentation.ts",
    "agent",
    "rules",
    "db",
    "app",
    "components",
    "tests",
    "screenshots",
    "node_modules",
  ],
  ...["auth", "cli", "sample-invoices", "extensions", "tui"],
]);

function checkTopLevel(folder: string): Problem[] {
  return readdirSync(folder)
    .filter((name) => !name.startsWith(".") && !TOP_LEVEL.has(name))
    .map((name) => `${folder}/${name}: not part of a product's shape. Move it into a part, or delete it.`);
}

function walk(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(folder, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function importsOf(source: ts.SourceFile): string[] {
  return source.statements
    .filter((node): node is ts.ImportDeclaration => ts.isImportDeclaration(node))
    .map((node) => (node.moduleSpecifier as ts.StringLiteral).text);
}

function checkImports(path: string, source: ts.SourceFile, product: string): Problem[] {
  const problems: Problem[] = [];
  const part = relative(product, path).split("/")[0] ?? "";
  for (const target of importsOf(source)) {
    // A relative import becomes its path inside the product, for example /agent/agent/.
    const resolved = target.startsWith(".") ? `/${relative(product, join(dirname(path), target))}/` : target;
    for (const rule of FORBIDDEN_IMPORTS[part] ?? []) {
      if (rule.test(resolved)) problems.push(`${path}: ${part}/ must not import "${target}".`);
    }
    // AI SDK's test module holds the mock model. A product always calls the real one.
    if (target === "ai/test")
      problems.push(`${path}: imports "ai/test". Products call the real model, never a mock.`);
    const other = PRODUCTS.find((each) => each.folder !== product && target.includes(each.folder));
    if (other) problems.push(`${path}: imports ${other.folder}. Products never import each other.`);
  }
  return problems;
}

function lineCount(source: ts.SourceFile, node: ts.Node): number {
  const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line;
  return source.getLineAndCharacterOfPosition(node.getEnd()).line - start + 1;
}

// A catch must rethrow or log. A catch that quietly returns a default hides a real failure.
function isSilentCatch(clause: ts.CatchClause): boolean {
  let handled = false;
  const visit = (node: ts.Node) => {
    if (ts.isThrowStatement(node)) handled = true;
    if (ts.isCallExpression(node) && /console\.error|\.error\(/.test(node.expression.getText()))
      handled = true;
    ts.forEachChild(node, visit);
  };
  visit(clause.block);
  return !handled;
}

function checkSyntax(path: string, source: ts.SourceFile, vendored: boolean): Problem[] {
  const problems: Problem[] = [];
  const visit = (node: ts.Node) => {
    const isFunction =
      ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node);
    if (isFunction && !vendored && lineCount(source, node) > MAX_FUNCTION_LINES) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      problems.push(
        `${path}:${line}: a function over ${MAX_FUNCTION_LINES} lines. Split it into named steps.`,
      );
    }
    if (ts.isCatchClause(node) && isSilentCatch(node)) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      problems.push(`${path}:${line}: a catch that neither rethrows nor logs. Show the error instead.`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return problems;
}

function checkCodeFile(path: string, product: string | undefined): Problem[] {
  const text = readFileSync(path, "utf8");
  const problems: Problem[] = [];
  const lines = text.split("\n").length;
  const vendored = VENDORED.test(path);
  if (lines > MAX_FILE_LINES && !vendored)
    problems.push(`${path}: ${lines} lines, over ${MAX_FILE_LINES}. Split the file.`);
  const fake = FAKE.exec(text);
  if (fake && !path.startsWith("scripts/check-"))
    problems.push(`${path}: uses ${fake[0]}. Use the real thing.`);
  const old = DEPRECATED.exec(text);
  if (old && !path.startsWith("scripts/check-"))
    problems.push(`${path}: calls ${old[0]} on a stream result. Use the helper of the same name from "ai".`);
  const kind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  problems.push(...checkSyntax(path, source, vendored));
  if (product) problems.push(...checkImports(path, source, product));
  return problems;
}

const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

function checkColours(files: string[]): Problem[] {
  return files
    .filter((path) => /\.(css|tsx)$/.test(path) && path !== TOKENS_FILE && !VENDORED.test(path))
    .filter((path) => COLOUR.test(readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")))
    .map((path) => `${path}: writes a colour. Colours live only in ${TOKENS_FILE}.`);
}

// A product missing from the root workspaces cannot find its packages, and fails only when it runs.
function checkWorkspaces(): Problem[] {
  const workspaces: string[] = JSON.parse(readFileSync("package.json", "utf8")).workspaces;
  return PRODUCTS.filter((product) => !workspaces.includes(product.folder)).map(
    (product) => `package.json: add "${product.folder}" to "workspaces", then run bun install.`,
  );
}

export function checkStructure(): Problem[] {
  const roots = ["packages", "scripts", "gallery", ...PRODUCTS.map((product) => product.folder)];
  const files = roots.filter((root) => statSync(root, { throwIfNoEntry: false })).flatMap(walk);
  const problems = [
    ...checkColours(files),
    ...checkSelects(files),
    ...checkTextBoxes(files),
    ...checkWorkspaces(),
  ];
  for (const product of PRODUCTS) problems.push(...checkTopLevel(product.folder));
  for (const path of files.filter((file) => CODE.test(file))) {
    const product = PRODUCTS.find((each) => path.startsWith(`${each.folder}/`))?.folder;
    problems.push(...checkCodeFile(path, product));
  }
  return problems;
}

if (import.meta.main) {
  const problems = checkStructure();
  for (const problem of problems) console.error(problem);
  console.log(problems.length ? `\n${problems.length} structure problems.` : "Structure: ok");
  process.exit(problems.length ? 1 : 0);
}
