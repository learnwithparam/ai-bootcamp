// The limits the assistant cannot talk its way past. Plain code that runs before any model call.
// A visitor gets a few questions a minute, and the whole site gets a fixed dollar amount of model spend a day.

export type Limits = { perMinute: number; dailyCapUsd: number };
export type Usage = { questionsLastMinute: number; spentTodayUsd: number };
export type Verdict = { open: true } | { open: false; status: 429 | 503; message: string };

export function readLimits(settings: Record<string, string | undefined>): Limits {
  const perMinute = Number(settings.SITE_ASSISTANT_PER_MINUTE);
  const dailyCapUsd = Number(settings.SITE_ASSISTANT_DAILY_CAP_USD);
  if (!(perMinute > 0) || !(dailyCapUsd > 0)) {
    throw new Error("Set SITE_ASSISTANT_PER_MINUTE and SITE_ASSISTANT_DAILY_CAP_USD to numbers above 0.");
  }
  return { perMinute, dailyCapUsd };
}

// The spend cap comes first: when it is reached, nobody gets an answer until the next day (UTC).
export function checkLimits(usage: Usage, limits: Limits): Verdict {
  if (usage.spentTodayUsd >= limits.dailyCapUsd) {
    return {
      open: false,
      status: 503,
      message: "The assistant is off for the rest of today. It is back at midnight UTC.",
    };
  }
  if (usage.questionsLastMinute >= limits.perMinute) {
    return {
      open: false,
      status: 429,
      message: "That is a lot of questions in one minute. Wait a moment, then ask again.",
    };
  }
  return { open: true };
}
