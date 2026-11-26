// Next.js runs register() once when the server starts. From then on every model call is traced in Langfuse.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startTracing } = await import("@bootcamp/tracing");
  startTracing();
}
