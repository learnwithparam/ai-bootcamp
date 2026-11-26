import type { Run } from "../rules/run";

// The one loud thing: the agent's real browser, as it looked after its last step.
export function BrowserView({ run, portal }: { run: Run; portal: string }) {
  const seen = run.steps.length > 1;
  return (
    <figure className="browser" aria-label="The agent's browser">
      <div className="browser-bar">
        <span className="browser-dots" aria-hidden="true" />
        <span className="browser-address">{run.requestUrl ?? portal}</span>
      </div>
      {seen ? (
        // biome-ignore lint/performance/noImgElement: a private picture that changes every step, not a static asset
        <img
          src={`/api/runs/${run.id}/screen?step=${run.steps.length}`}
          alt="The intake portal as the agent's browser shows it now"
          width={1100}
          height={900}
        />
      ) : (
        <p className="browser-empty">The browser opens once the agent has read the email.</p>
      )}
    </figure>
  );
}
