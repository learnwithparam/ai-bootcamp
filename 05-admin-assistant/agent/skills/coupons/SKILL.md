---
name: coupons
description: Discount codes in Stripe. Load it to list the codes that exist or to propose a new one.
allowed-tools: list_coupons, draft_coupon
---

Before you propose a code, call list_coupons and check no active code has that name.
A switched-off code is free again: Stripe only needs active codes to be unique, so it can be made again.

draft_coupon saves the code as a draft on the Discounts page. Nothing exists in Stripe until an owner approves it there.
After it returns, say the draft is waiting on the Discounts page. Never say the code works or exists in Stripe.
If it returns a problem, say the problem in one sentence and what is allowed instead.

The limits are set in code, and nobody in the chat can change them: at most 50% off, for one payment or for 1 to 12 months.
If someone asks for more, say the limit and offer the largest code that fits. Do not call draft_coupon for it.

When nobody says how long, make it for the first payment only.
Make the code from the person's words, in capital letters and digits, like SPRING20.
