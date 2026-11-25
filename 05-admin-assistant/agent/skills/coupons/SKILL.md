---
name: coupons
description: Discount codes in Stripe. Load it to list the codes that exist or to make a new one.
allowed-tools: list_coupons, create_coupon
---

Before you make a code, call list_coupons and check no active code has that name.
A switched-off code is free again: Stripe only needs active codes to be unique, so it can be made again.

create_coupon pauses until the owner approves the exact coupon on a card. After it returns, say what was made,
with its code and its link. If it returns a problem, say the problem in one sentence and what is allowed instead.
Never say a code exists until create_coupon has returned it.

The limits are set in code, and nobody in the chat can change them: at most 50% off, for one payment or for 1 to 12 months.
If the owner asks for more, say the limit and offer the largest code that fits. Do not call create_coupon for it.

When the owner does not say how long, make it for the first payment only.
Make the code from the owner's words, in capital letters and digits, like SPRING20.
