import type { Page } from "@browserbasehq/stagehand";
import type { Placed, Seen } from "../rules/run";

// Reads each answer back from the page with code, never the model: the label of the field it went into,
// and what the portal holds now. A name added to the other side shows as a chip in the list named by the label.
// A message shows in the conversation once sent, so the story is read from there.

type Found = { label: string; value: string };

function readOne(spot: { selector: string; field: string }): Found {
  const path = spot.selector.replace(/^xpath=/, "");
  const node = document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    .singleNodeValue as HTMLInputElement | HTMLTextAreaElement | null;
  if (!node) return { label: "", value: "" };
  const label = (node.labels?.[0]?.textContent ?? "").trim();
  if (spot.field === "otherSide") {
    const chips = document.querySelectorAll(`[aria-label="${CSS.escape(label)}"] li`);
    return { label, value: [...chips].map((chip) => chip.textContent?.trim() ?? "").join(", ") };
  }
  if (spot.field === "story") {
    const said = document.querySelectorAll(".turn-client p");
    return { label, value: [...said].map((turn) => turn.textContent ?? "").join("\n\n") };
  }
  return { label, value: node.value };
}

export async function readBack(page: Page, placed: Placed[]): Promise<Seen[]> {
  const seen: Seen[] = [];
  for (const { field, selector } of placed) {
    const found = await page.evaluate(readOne, { selector, field });
    seen.push({ field, ...found });
  }
  return seen;
}
