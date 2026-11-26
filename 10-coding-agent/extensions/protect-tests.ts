import type { Extension } from "../agent/extensions";

// The tests are how the harness knows the work is done. An agent that may edit them can make any check pass
// by weakening the test, so it may not write to a test file at all.

const TEST_FILE = /(^|\/)(__tests__\/|[^/]+\.(test|spec)\.[cm]?[jt]sx?$)/;

export const protectTests: Extension = {
  name: "Protect tests",
  beforeTool: ({ tool, input }) => {
    if (tool !== "write" && tool !== "edit") return null;
    if (!TEST_FILE.test(String(input.path ?? ""))) return null;
    return "Test files decide when the work is done, so they cannot be changed. Change the code under test instead.";
  },
};
