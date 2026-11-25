import { z } from "zod";

// One tool, written once and offered three ways: in the web chat, over MCP, and in the CLI.
// Each way in passes the caller's account id from its own sign-in, never from the tool's input.

export type CatalogTool = {
  name: string;
  description: string;
  input: z.ZodObject;
  // A personal tool reads or changes one account's data, so it needs a signed-in caller.
  personal: boolean;
  run: (input: unknown, userId: string | null) => Promise<unknown>;
};

export class SignInNeeded extends Error {}

// A wrong argument reads as a sentence ("query: Too small..."), the same in chat, MCP and the CLI.
function check<Input extends z.ZodObject>(schema: Input, input: unknown): z.infer<Input> {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(z.prettifyError(result.error));
  return result.data;
}

type Spec<Input extends z.ZodObject> = { name: string; description: string; input: Input };

// The input is checked against its schema here, so a bad argument fails the same way in all three.
export function publicTool<Input extends z.ZodObject>(
  spec: Spec<Input> & { run: (input: z.infer<Input>) => Promise<unknown> },
): CatalogTool {
  return { ...spec, personal: false, run: (input) => spec.run(check(spec.input, input)) };
}

// The caller check lives here, in the only way to make a personal tool, so no tool can forget it.
export function personalTool<Input extends z.ZodObject>(
  spec: Spec<Input> & { run: (input: z.infer<Input>, userId: string) => Promise<unknown> },
): CatalogTool {
  return {
    ...spec,
    personal: true,
    run: async (input, userId) => {
      if (!userId) throw new SignInNeeded(`${spec.name} works only when you are signed in.`);
      return spec.run(check(spec.input, input), userId);
    },
  };
}
