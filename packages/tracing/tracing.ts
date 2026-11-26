import { required } from "@bootcamp/model";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

// Sends every model call to Langfuse, so each run can be opened and read there.
// Each product's instrumentation.ts calls startTracing() once when its server starts.
// Model calls opt in with: experimental_telemetry: { isEnabled: true, functionId: "<what it does>" }

let started = false;

export function startTracing(): void {
  if (started) return;
  const provider = new NodeTracerProvider({
    spanProcessors: [
      new LangfuseSpanProcessor({
        publicKey: required("LANGFUSE_PUBLIC_KEY"),
        secretKey: required("LANGFUSE_SECRET_KEY"),
        baseUrl: required("LANGFUSE_BASE_URL"),
      }),
    ],
  });
  provider.register();
  started = true;
}
