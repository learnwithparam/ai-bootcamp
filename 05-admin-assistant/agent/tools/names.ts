// The tools that save something. The panel draws the page again after one of them, so the change shows on the object.
// It is its own file because the browser imports it, and the tools themselves must never reach the browser.
export const SAVES_SOMETHING = ["draft_coupon", "save_newsletter_draft", "revise_newsletter"] as const;
