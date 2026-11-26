import type { Extension } from "../agent/extensions";

// A new package is code from a stranger, so a person decides on it, never the agent.
// package.json and the lock files are refused, which also keeps the agent from changing the version or the scripts.

const PACKAGE_FILES = /(^|\/)(package\.json|bun\.lockb?|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/;

export const noNewPackages: Extension = {
  name: "No new packages",
  beforeTool: ({ tool, input }) => {
    if (tool !== "write" && tool !== "edit") return null;
    if (!PACKAGE_FILES.test(String(input.path ?? ""))) return null;
    return "package.json and lock files are changed by a person, not the agent. Solve it with the code that is there.";
  },
};
