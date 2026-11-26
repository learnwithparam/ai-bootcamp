// What one call cost, added up in code from what the call used.
// The models are the ones LiveKit's own agent-starter-node uses. Every price is LiveKit Inference's,
// read on livekit.com/pricing/inference on 26 Nov 2026.

export const SPEECH_TO_TEXT = { model: "assemblyai/universal-3-6-pro", usdPerMinute: 0.0075 };
export const TEXT_TO_SPEECH = {
  model: "fishaudio/s2.1-pro",
  voice: "fa4c9eb3dccc4806b382b40d61c6b10a",
  usdPerMillionCharacters: 15,
};
export const LANGUAGE_MODEL = {
  model: "google/gemma-4-31b-it",
  usdPerMillionInput: 0.4,
  usdPerMillionCachedInput: 0.2,
  usdPerMillionOutput: 1.2,
};
// ai-coustics voice isolation cleans the caller's line. The plan's free minutes run out, so it is
// counted at the price after them, for every minute of the call.
export const NOISE_CANCELLATION = { usdPerMinute: 0.0012 };

export type CallUsage = {
  heardSeconds: number;
  spokenCharacters: number;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
};

export const NO_USAGE: CallUsage = {
  heardSeconds: 0,
  spokenCharacters: 0,
  promptTokens: 0,
  cachedTokens: 0,
  completionTokens: 0,
};

export function callCost(usage: CallUsage, callSeconds: number): number {
  const heard = (usage.heardSeconds / 60) * SPEECH_TO_TEXT.usdPerMinute;
  const spoken = (usage.spokenCharacters / 1_000_000) * TEXT_TO_SPEECH.usdPerMillionCharacters;
  const cached = Math.min(usage.cachedTokens, usage.promptTokens);
  const model =
    ((usage.promptTokens - cached) * LANGUAGE_MODEL.usdPerMillionInput +
      cached * LANGUAGE_MODEL.usdPerMillionCachedInput +
      usage.completionTokens * LANGUAGE_MODEL.usdPerMillionOutput) /
    1_000_000;
  const cleaned = (callSeconds / 60) * NOISE_CANCELLATION.usdPerMinute;
  return heard + spoken + model + cleaned;
}

export function addUsage(total: CallUsage, more: Partial<CallUsage>): CallUsage {
  return {
    heardSeconds: total.heardSeconds + (more.heardSeconds ?? 0),
    spokenCharacters: total.spokenCharacters + (more.spokenCharacters ?? 0),
    promptTokens: total.promptTokens + (more.promptTokens ?? 0),
    cachedTokens: total.cachedTokens + (more.cachedTokens ?? 0),
    completionTokens: total.completionTokens + (more.completionTokens ?? 0),
  };
}
