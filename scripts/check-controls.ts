import { readFileSync } from "node:fs";

import type { Problem } from "./check-structure";

// One select style for every product, in controls.css. A product's own select rule brought back
// the browser arrow touching the edge, so no other stylesheet may style a select.
const SELECT_RULE = /(^|[\s,}>])select\b[^{;]*\{/m;
const CONTROLS_FILE = "packages/ui/controls.css";

export function checkSelects(files: string[]): Problem[] {
  return files
    .filter((path) => path.endsWith(".css") && path !== CONTROLS_FILE)
    .filter((path) => SELECT_RULE.test(readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")))
    .map((path) => `${path}: styles a select. Selects are styled only in ${CONTROLS_FILE}.`);
}

// Every text box names its look. The newsletter editor shipped a bare input and textarea that the
// browser drew in its own style, so a text input or textarea must carry a className.
const TEXT_BOX = /<(input|textarea)\b([\s\S]*?)\/>/g;
const NOT_TEXT = /type="(hidden|checkbox|radio|file|submit)"/;

export function checkTextBoxes(files: string[]): Problem[] {
  const problems: Problem[] = [];
  for (const path of files.filter((file) => file.endsWith(".tsx"))) {
    for (const match of readFileSync(path, "utf8").matchAll(TEXT_BOX)) {
      const attributes = match[2] ?? "";
      if (NOT_TEXT.test(attributes) || /\bclassName=/.test(attributes)) continue;
      problems.push(
        `${path}: a bare <${match[1]}>. Give it className="field" so it matches every other box.`,
      );
    }
  }
  return problems;
}
