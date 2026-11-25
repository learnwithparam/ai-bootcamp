import { expect, test } from "bun:test";
import type { UIMessage } from "ai";
import { activeToolsFor, skillsLoadedIn } from "../agent/agent";
import { SKILLS } from "../agent/skills/skills";
import { allTools, NEEDS_APPROVAL } from "../agent/tools/all";
import type { CreateCouponOutput } from "../agent/tools/create-coupon";

// The structure of the skills, walked as a whole, so a new skill or tool is covered with no new test.

const tools = allTools("test:owner");
const names = Object.keys(tools);

test("every tool a SKILL.md lists exists", () => {
  for (const skill of SKILLS) for (const tool of skill.allowedTools) expect(names).toContain(tool);
});

test("every tool but load_skill belongs to exactly one skill", () => {
  for (const name of names.filter((each) => each !== "load_skill")) {
    const owners = SKILLS.filter((skill) => skill.allowedTools.includes(name));
    expect({ name, skills: owners.length }).toEqual({ name, skills: 1 });
  }
});

test("before any skill is loaded, only load_skill can be called", () => {
  expect(activeToolsFor([])).toEqual(["load_skill"]);
  expect(activeToolsFor(["coupons"]).sort()).toEqual(["create_coupon", "list_coupons", "load_skill"]);
  expect(activeToolsFor(["no-such-skill"])).toEqual(["load_skill"]);
});

test("a skill stays loaded for the rest of the conversation", () => {
  const history: UIMessage[] = [
    {
      id: "a",
      role: "assistant",
      parts: [
        {
          type: "tool-load_skill",
          toolCallId: "1",
          state: "output-available",
          input: { name: "reports" },
          output: {},
        },
        {
          type: "tool-load_skill",
          toolCallId: "2",
          state: "output-error",
          input: { name: "coupons" },
          errorText: "x",
        },
      ],
    },
  ];
  expect(skillsLoadedIn(history)).toEqual(["reports"]);
});

test("every tool that changes Stripe waits for approval", () => {
  expect(NEEDS_APPROVAL).toContain("create_coupon");
});

test("an approved coupon outside the limits is refused before Stripe is called", async () => {
  const execute = tools.create_coupon.execute;
  if (!execute) throw new Error("create_coupon has no execute");
  const output = (await execute(
    { code: "HUGE90", percentOff: 90, duration: "once" },
    { toolCallId: "test", messages: [] },
  )) as CreateCouponOutput;
  expect(output).toEqual({ made: false, problem: "The largest discount allowed is 50%." });
});
