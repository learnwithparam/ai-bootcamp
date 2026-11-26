import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PRODUCTS } from "@bootcamp/products";

// bun run syllabus: writes syllabus.json, the 12-week cohort the course platform imports.
// Every module is one product folder. Keys come from folder names, so they stay the same between runs.
// The platform validates the shape in syllabus-shape.ts. `bun run check` fails when the file is stale.

export const REPO = "learnwithparam/ai-bootcamp";
export const OUTPUT = "syllabus.json";
// Pull request checkouts run the job named "check" (.github/workflows/check.yml). It runs every product's rules tests.
export const CHECK_JOB = "check";
const MAX_BODY_CHARS = 2000;
const WORDS_PER_MINUTE = 200;

export type Item = {
  key: string;
  kind: "video" | "reading" | "lab" | "task" | "live";
  title: string;
  minutes: number;
  body_md?: string;
  lab?: { slug: string; repo_path: string };
  proof?: { kind: "github-check" | "screenshot" | "none"; check_name?: string };
  rubric_key?: string;
};
export type Unit = { key: string; title: string; items: Item[] };
export type Module = { key: string; title: string; units: Unit[] };
export type Syllabus = {
  source: { repo: string; ref: string; sha: string };
  tree: { modules: Module[] };
};

// The text of one "## Heading" section, without the heading.
export function section(readme: string, heading: string): string {
  const lines = readme.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return "";
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join("\n")
    .trim();
}

function shorten(text: string): string {
  if (text.length <= MAX_BODY_CHARS) return text;
  const cut = text.slice(0, MAX_BODY_CHARS);
  return cut.slice(0, cut.lastIndexOf("\n\n")).trim();
}

export function readingBody(readme: string): string {
  const why = section(readme, "Why");
  const goal = section(readme, "Goal");
  return shorten([why && `## Why\n\n${why}`, goal && `## Goal\n\n${goal}`].filter(Boolean).join("\n\n"));
}

function readingMinutes(body: string): number {
  return Math.max(5, Math.ceil(body.split(/\s+/).length / WORDS_PER_MINUTE));
}

// An hour to read and run a product, plus ten minutes for each step in its "Try these" list.
function labMinutes(readme: string): number {
  return 60 + 10 * (section(readme, "Try these").match(/^\d+\. /gm) ?? []).length;
}

function moduleFor(week: number, folder: string, slug: string, title: string): Module {
  const readme = readFileSync(join(folder, "README.md"), "utf8");
  const body = readingBody(readme);
  const isSetup = week === 0;
  const unitKey = `${slug}-build`;
  return {
    key: `w${String(week).padStart(2, "0")}`,
    title: isSetup ? "Set up once" : title,
    units: [
      {
        key: unitKey,
        title: isSetup ? "Set up your machine" : `Build the ${title.toLowerCase()}`,
        items: [
          {
            key: `${unitKey}-reading`,
            kind: "reading",
            title: `The problem and the goal: ${title}`,
            minutes: readingMinutes(body),
            body_md: body,
          },
          {
            key: `${unitKey}-lab`,
            kind: "lab",
            title: isSetup ? "Run setup" : `Run and read the ${title.toLowerCase()}`,
            minutes: isSetup ? 30 : labMinutes(readme),
            lab: { slug, repo_path: folder },
            // Setup has no tests of its own. Every product has rules tests that run in the gate job.
            proof: isSetup ? { kind: "none" } : { kind: "github-check", check_name: CHECK_JOB },
            rubric_key: "cohort",
          },
        ],
      },
    ],
  };
}

export function gitSha(): string {
  return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
}

export function buildSyllabus(sha: string): Syllabus {
  const modules = [
    moduleFor(0, "00-setup", "setup", "Set up once"),
    ...PRODUCTS.map((product) =>
      moduleFor(Number(product.folder.slice(0, 2)), product.folder, product.slug, product.title),
    ),
  ];
  return { source: { repo: REPO, ref: "main", sha }, tree: { modules } };
}

export function render(syllabus: Syllabus): string {
  return `${JSON.stringify(syllabus, null, 2)}\n`;
}

if (import.meta.main) {
  writeFileSync(OUTPUT, render(buildSyllabus(gitSha())));
  console.log(`Wrote ${OUTPUT}.`);
}
