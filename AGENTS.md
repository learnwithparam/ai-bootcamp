# AI Bootcamp

Hands-on AI engineering demos, bootcamp-ready workshop material, and production-style examples for learners who want to build real apps with modern AI tools.

**This is teaching material, not a product.** The bar is that a learner can clone it and run it.
Optimise for a working first command and a clear error when something is missing, not for architecture.

## Running it

Run every command from the repo root, so Bun loads the root environment file.

```bash
bun run setup                  # Postgres and Langfuse in Docker, migrations, seed data
bun run dev invoice-inbox      # one product on its own port
bun run check                  # types, Biome, structure, learner pages, prose, unit tests
bun run proof invoice-inbox    # the real-model tests behind each page's "Prove it"
```

## Rules

- **Never break the first-run path.** A learner hitting an error in step one abandons the workshop.
  If you change setup, run it from a clean clone before calling it done.
- **Explanations belong in the README and in notebook prose**, not in long code comments. The code is
  the lesson; it should read as the clearest version of the idea.
- **No em dashes** in prose, per the house rules in
  `/Users/param/.claude/skills/lwp-shared/house-rules.md`.
- **Pin what you can.** A workshop that worked last term and breaks this term because an upstream
  package moved is the most common failure here.
