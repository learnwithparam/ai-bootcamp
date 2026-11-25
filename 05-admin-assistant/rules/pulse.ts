// The suggestions on Home, worked out in plain code from the store's own numbers. No model decides what to show.
// Each one either asks the assistant something or links to the page where the work waits.

export type PulseFacts = {
  signupsThisWeek: number;
  signupsLastWeek: number;
  discountDraftsWaiting: number;
  newsletterDraftsWaiting: number;
  daysSinceLastNewsletter: number | null;
  nextLab: { title: string; date: string } | null;
  activeCodes: number;
};

export type Suggestion =
  | { id: string; title: string; why: string; ask: string }
  | { id: string; title: string; why: string; href: string };

export const MAX_SUGGESTIONS = 5;

// The change in percent from last week, rounded. Null when last week had no signups, since any change is then infinite.
export function weekChange(thisWeek: number, lastWeek: number): number | null {
  if (lastWeek === 0) return null;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

function waitingWork(facts: PulseFacts): Suggestion[] {
  const found: Suggestion[] = [];
  if (facts.discountDraftsWaiting > 0) {
    const codes =
      facts.discountDraftsWaiting === 1 ? "1 discount code" : `${facts.discountDraftsWaiting} discount codes`;
    found.push({
      id: "codes",
      title: `Approve ${codes}`,
      why: "Nothing is made in Stripe until an owner approves.",
      href: "/discounts",
    });
  }
  if (facts.newsletterDraftsWaiting > 0) {
    found.push({
      id: "letters",
      title: "Review the newsletter draft",
      why: "A draft is waiting for an owner to approve it.",
      href: "/newsletters",
    });
  }
  return found;
}

function signupTrend(facts: PulseFacts): Suggestion[] {
  const change = weekChange(facts.signupsThisWeek, facts.signupsLastWeek);
  if (change === null || Math.abs(change) < 20) return [];
  const direction = change < 0 ? `fell ${-change}%` : `rose ${change}%`;
  return [
    {
      id: "trend",
      title: `Signups ${direction} this week`,
      why: `${facts.signupsThisWeek} this week, ${facts.signupsLastWeek} the week before.`,
      ask: "Compare signups this week with last week, day by day.",
    },
  ];
}

function contentIdeas(facts: PulseFacts): Suggestion[] {
  const found: Suggestion[] = [];
  if (facts.daysSinceLastNewsletter === null || facts.daysSinceLastNewsletter >= 7) {
    const why =
      facts.daysSinceLastNewsletter === null
        ? "There is no newsletter yet."
        : `The last one was written ${facts.daysSinceLastNewsletter} days ago.`;
    found.push({
      id: "newsletter",
      title: "Draft this week's newsletter",
      why,
      ask: "Draft this week's newsletter.",
    });
  }
  if (facts.nextLab) {
    found.push({
      id: "lab-code",
      title: `Make a code for ${facts.nextLab.title}`,
      why: `It runs on ${facts.nextLab.date}.`,
      ask: `Make a 15% code for the first payment, for the live lab "${facts.nextLab.title}".`,
    });
  }
  return found;
}

// Work that waits for a person comes first, then what the numbers point to, then ideas. At most five.
export function pulse(facts: PulseFacts): Suggestion[] {
  return [...waitingWork(facts), ...signupTrend(facts), ...contentIdeas(facts)].slice(0, MAX_SUGGESTIONS);
}
