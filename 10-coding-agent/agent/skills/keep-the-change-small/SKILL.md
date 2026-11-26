---
name: keep-the-change-small
description: How to make a change a reviewer can read in a minute, in the repo's own style.
---

- Change only what the task needs. No renames, no reformatting, no tidying of code you did not need to touch.
- Copy the style around you: the same quotes, spacing, naming and comment voice as the lines nearby.
- Prefer adding a case next to similar cases over a new helper. A new helper is right only when three places need it.
- Keep public names and types the same, unless the task asks to change them.
- If the README lists what the code supports, and the task adds to it, add the new item to that list too.
- Before you call done, run `git diff` and read your own change as a reviewer would.
