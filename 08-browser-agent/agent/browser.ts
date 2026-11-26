import { model } from "@bootcamp/model";
import { type ClientLLM, localBrowser, type Page, Stagehand } from "@browserbasehq/stagehand";
import { generateText, jsonSchema, type ModelMessage, Output } from "ai";
import { INTAKE, PORTAL } from "./portal";
import { costOf } from "./prompt";

// A real Chrome, driven by Stagehand. Stagehand asks our model, through generate below, which element to use.

type Input = Parameters<ClientLLM["generate"]>[0];
type Part = Exclude<Input["messages"][number]["content"], unknown[]> & { type: string };

function toPart(part: Part) {
  if (part.type === "text" && "text" in part) return { type: "text" as const, text: part.text };
  if (part.type === "image" && "data" in part)
    return { type: "image" as const, image: part.data, mediaType: part.mimeType };
  throw new Error(`Stagehand sent a ${part.type} part, which this agent does not use.`);
}

// Stagehand's model call, answered by the same model() every product uses. Each call adds its cost to spent.
function modelFor(spent: { cost: number }): ClientLLM {
  const generate = async (input: Input) => {
    if ("tools" in input && input.tools?.length) throw new Error("This agent never gives Stagehand tools.");
    const messages = input.messages.map((message) => ({
      role: message.role,
      content: (Array.isArray(message.content) ? message.content : [message.content]).map((part) =>
        toPart(part as Part),
      ),
    })) as ModelMessage[];
    const asked = "responseFormat" in input ? input.responseFormat : undefined;
    const format = asked?.type === "json_schema" ? asked : undefined;
    const result = await generateText({
      model: model(),
      system: input.systemPrompt,
      messages,
      temperature: input.temperature,
      ...(format ? { output: Output.object({ schema: jsonSchema(format.schema as object) }) } : {}),
      experimental_telemetry: { isEnabled: true, functionId: "browser-agent-stagehand" },
    });
    spent.cost += costOf(result.usage);
    const usage = {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      totalTokens: result.usage.totalTokens ?? 0,
    };
    const content = [{ type: "text" as const, text: format ? JSON.stringify(result.output) : result.text }];
    return format
      ? {
          role: "assistant" as const,
          content,
          usage,
          outputFormat: "json_schema" as const,
          structuredContent: result.output,
        }
      : { role: "assistant" as const, content, usage, outputFormat: "text" as const };
  };
  return { generate } as ClientLLM;
}

export type Session = {
  stagehand: Stagehand;
  page: Page;
  spent: { cost: number };
  close: () => Promise<void>;
};

// Opens the portal in a fresh browser that may visit the portal and nowhere else.
export async function openPortal(): Promise<Session> {
  const browser = await localBrowser.launch({ headless: true, viewport: { width: 1100, height: 900 } });
  const spent = { cost: 0 };
  try {
    const stagehand = await Stagehand.create({ browser, model: modelFor(spent), logging: { level: "warn" } });
    await browser.context.setDomainPolicy({ allowedDomains: [new URL(PORTAL).hostname] });
    const [page] = await browser.context.pages();
    if (!page) throw new Error("The browser opened with no page.");
    await page.goto(INTAKE);
    // Answers typed before the page is running would show on screen but never reach the form.
    await page.waitForSelector(".intake-desk[aria-busy=false]", { timeout: 30_000 });
    const close = async () => {
      await stagehand.close();
      await browser.close();
    };
    return { stagehand, page, spent, close };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export async function picture(page: Page): Promise<string> {
  return Buffer.from(await page.screenshot({ type: "jpeg", quality: 70 })).toString("base64");
}
