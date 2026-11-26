// The lead score, in code. The model only reads facts out of checked claims; this file turns them into a number.
// The buyer we look for: a company with an engineering team that would pay to train it in AI engineering.

// Each fact names the claims it was read from. A fact with no checked claim behind it counts as unknown.
export type Fact<Value> = { value: Value | null; claimIds: string[] };

export type Facts = {
  employees: Fact<number>;
  lastRoundMonth: Fact<string>;
  hiringEngineers: Fact<boolean>;
  buildsWithAI: Fact<boolean>;
};

export type Reason = { points: number; max: number; why: string; claimIds: string[] };
export type Score = { total: number; fit: "strong" | "possible" | "weak"; reasons: Reason[] };

// Drops any fact whose claims are not among the checked ones, so a fact cannot lean on a claim that failed its check.
export function backedFacts(facts: Facts, checkedIds: Set<string>): Facts {
  const backed = <Value>(fact: Fact<Value>): Fact<Value> =>
    fact.value !== null && fact.claimIds.length > 0 && fact.claimIds.every((id) => checkedIds.has(id))
      ? fact
      : { value: null, claimIds: [] };
  return {
    employees: backed(facts.employees),
    lastRoundMonth: backed(facts.lastRoundMonth),
    hiringEngineers: backed(facts.hiringEngineers),
    buildsWithAI: backed(facts.buildsWithAI),
  };
}

export function monthsBetween(month: string, today: string): number {
  const [year, number] = month.split("-").map(Number);
  const [nowYear, nowNumber] = today.split("-").map(Number);
  return ((nowYear ?? 0) - (year ?? 0)) * 12 + ((nowNumber ?? 0) - (number ?? 0));
}

function sizeReason(fact: Fact<number>): Reason {
  const people = fact.value;
  if (people === null) return { points: 0, max: 30, why: "Team size not found.", claimIds: [] };
  if (people >= 50 && people <= 5000) {
    return {
      points: 30,
      max: 30,
      why: `${people} people: big enough to train a team.`,
      claimIds: fact.claimIds,
    };
  }
  if (people >= 20 && people <= 20000) {
    return { points: 15, max: 30, why: `${people} people: outside the best size.`, claimIds: fact.claimIds };
  }
  return { points: 0, max: 30, why: `${people} people: too small or too large.`, claimIds: fact.claimIds };
}

function roundReason(fact: Fact<string>, today: string): Reason {
  if (fact.value === null) return { points: 0, max: 20, why: "No funding round found.", claimIds: [] };
  const months = monthsBetween(fact.value, today);
  if (months >= 0 && months <= 24) {
    return {
      points: 20,
      max: 20,
      why: `Raised money in ${fact.value}, within two years.`,
      claimIds: fact.claimIds,
    };
  }
  return {
    points: 0,
    max: 20,
    why: `Last round ${fact.value}, over two years ago.`,
    claimIds: fact.claimIds,
  };
}

function yesReason(fact: Fact<boolean>, max: number, yes: string, no: string, unknown: string): Reason {
  if (fact.value === null) return { points: 0, max, why: unknown, claimIds: [] };
  return { points: fact.value ? max : 0, max, why: fact.value ? yes : no, claimIds: fact.claimIds };
}

export function leadScore(facts: Facts, today: string): Score {
  const reasons = [
    sizeReason(facts.employees),
    roundReason(facts.lastRoundMonth, today),
    yesReason(
      facts.hiringEngineers,
      25,
      "Hiring engineers now.",
      "Not hiring engineers.",
      "Hiring not found.",
    ),
    yesReason(facts.buildsWithAI, 25, "Builds with AI.", "No sign of AI work.", "Use of AI not found."),
  ];
  const total = reasons.reduce((sum, reason) => sum + reason.points, 0);
  const fit = total >= 70 ? "strong" : total >= 40 ? "possible" : "weak";
  return { total, fit, reasons };
}
