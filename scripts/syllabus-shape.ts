// The shape the course platform validates. Anything outside it is a problem, so the import never fails late.

const KEY = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const KINDS = ["video", "reading", "lab", "task", "live"];
const PROOFS = ["github-check", "screenshot", "none"];
const ITEM_FIELDS = ["key", "kind", "title", "minutes", "body_md", "lab", "proof", "rubric_key"];
const MAX_BYTES = 256 * 1024;

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;

function checkItem(item: unknown, where: string, problems: string[]) {
  if (!isObj(item)) return void problems.push(`${where}: not an object.`);
  for (const field of Object.keys(item)) {
    if (!ITEM_FIELDS.includes(field)) problems.push(`${where}: field "${field}" is not allowed.`);
  }
  if (typeof item.key !== "string" || !KEY.test(item.key)) problems.push(`${where}: bad key.`);
  if (!KINDS.includes(item.kind as string)) problems.push(`${where}: bad kind.`);
  if (!isText(item.title)) problems.push(`${where}: missing title.`);
  if (!Number.isInteger(item.minutes) || (item.minutes as number) <= 0)
    problems.push(`${where}: bad minutes.`);
  if (item.body_md !== undefined && typeof item.body_md !== "string") problems.push(`${where}: bad body_md.`);
  if (item.rubric_key !== undefined && !isText(item.rubric_key)) problems.push(`${where}: bad rubric_key.`);
  if (item.lab !== undefined && !(isObj(item.lab) && isText(item.lab.slug) && isText(item.lab.repo_path))) {
    problems.push(`${where}: lab needs slug and repo_path.`);
  }
  const proof = item.proof;
  if (proof !== undefined) {
    if (!isObj(proof) || !PROOFS.includes(proof.kind as string)) problems.push(`${where}: bad proof.`);
    else if (proof.check_name !== undefined && !isText(proof.check_name))
      problems.push(`${where}: bad check_name.`);
  }
}

function checkKeyed(node: unknown, where: string, seen: Set<string>, problems: string[]): node is Obj {
  if (!isObj(node)) {
    problems.push(`${where}: not an object.`);
    return false;
  }
  if (typeof node.key !== "string" || !KEY.test(node.key)) problems.push(`${where}: bad key.`);
  else if (seen.has(node.key)) problems.push(`${where}: duplicate key ${node.key}.`);
  else seen.add(node.key);
  if (!isText(node.title)) problems.push(`${where}: missing title.`);
  return true;
}

function checkSource(source: unknown, problems: string[]) {
  if (!isObj(source)) return void problems.push("source: missing.");
  for (const field of ["repo", "ref", "sha"]) {
    if (!isText(source[field])) problems.push(`source.${field}: missing.`);
  }
}

export function validateSyllabus(data: unknown): string[] {
  const problems: string[] = [];
  if (!isObj(data)) return ["The file is not an object."];
  checkSource(data.source, problems);
  const modules = isObj(data.tree) ? data.tree.modules : undefined;
  if (!Array.isArray(modules)) return [...problems, "tree.modules: missing."];
  const seen = new Set<string>();
  modules.forEach((module, m) => {
    if (!checkKeyed(module, `module ${m}`, seen, problems)) return;
    const units = Array.isArray(module.units) ? module.units : [];
    if (units.length === 0) problems.push(`module ${m}: no units.`);
    units.forEach((unit, u) => {
      if (!checkKeyed(unit, `module ${m} unit ${u}`, seen, problems)) return;
      const items = Array.isArray(unit.items) ? unit.items : [];
      if (items.length === 0) problems.push(`module ${m} unit ${u}: no items.`);
      items.forEach((item, i) => {
        checkItem(item, `module ${m} unit ${u} item ${i}`, problems);
        if (isObj(item) && typeof item.key === "string" && seen.has(item.key)) {
          problems.push(`module ${m} unit ${u} item ${i}: duplicate key ${item.key}.`);
        } else if (isObj(item) && typeof item.key === "string") seen.add(item.key);
      });
    });
  });
  if (JSON.stringify(data).length > MAX_BYTES) problems.push("The file is over 256 KB.");
  return problems;
}
