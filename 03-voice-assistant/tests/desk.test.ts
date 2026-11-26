import { expect, test } from "bun:test";
import { Glob } from "bun";

// Next.js renders a layout and its page at the same time, so the layout's team check alone does not stop
// a page from loading calls and transcripts. Every front desk page and action calls requireTeam itself.

const DESK = "03-voice-assistant/app/desk";

test("every front desk page calls requireTeam first", async () => {
  const pages = [...new Glob("**/page.tsx").scanSync(DESK)];
  expect(pages.length).toBeGreaterThan(0);
  for (const page of pages) {
    const source = await Bun.file(`${DESK}/${page}`).text();
    const body = source.slice(source.indexOf("export default async function"));
    const firstLine = body.split("\n")[1]?.trim();
    expect({ page, firstLine }).toEqual({ page, firstLine: "await requireTeam();" });
  }
});

test("every front desk action calls requireTeam", async () => {
  const source = await Bun.file(`${DESK}/actions.ts`).text();
  const actions = source.split("export async function ").slice(1);
  expect(actions.length).toBeGreaterThan(0);
  for (const action of actions) {
    const name = action.slice(0, action.indexOf("("));
    expect({ name, checked: action.includes("await requireTeam()") }).toEqual({ name, checked: true });
  }
});
