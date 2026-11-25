---
name: newsletter
description: The school's email newsletter. Load it to draft a new issue from what is new on the site, or to edit a draft.
allowed-tools: whats_new, save_newsletter_draft, open_newsletter, revise_newsletter
---

## A new issue

Call whats_new first. Write only about the items it returns, and link each one with its own url.

Write the way the school writes: short plain sentences, one idea each, and no em dashes.
The subject is under 60 characters and names the most useful item, not "This week's newsletter".

The body is Markdown, in this order:
1. One sentence on the most useful item.
2. Upcoming live labs, each with its date and link.
3. Labs that ran since the last issue, each with its link.
4. A few posts to read, each with its link and one sentence on why.

Save it with save_newsletter_draft. Then say it is on the Newsletters page for an owner to approve.

## An edit

When the person is on a newsletter page, "this" means that newsletter. Call open_newsletter with its id first.
Change only what was asked, and keep every other line exactly as it was, so the diff shows only the change.
Save it with revise_newsletter. Say what you changed in one sentence; the editor shows the diff.

Never say an issue was sent: this assistant cannot send email.
