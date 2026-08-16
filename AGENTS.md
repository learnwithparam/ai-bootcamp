# AI Bootcamp

Hands-on AI engineering demos, bootcamp-ready workshop material, and production-style examples for learners who want to build real apps with modern AI tools.

**This is teaching material, not a product.** The bar is that a learner can clone it and run it.
Optimise for a working first command and a clear error when something is missing, not for architecture.

## Running it

```bash
make help
make install
make dev
make test
```

All targets: `help`, `install`, `dev`, `dev-no-build`, `dev-local`, `build`, `build-no-cache`, `start`, `stop`, `restart`, `api`, `frontend`, `logs`, `logs-api` ....

## Rules

- **Never break the first-run path.** A learner hitting an error in step one abandons the workshop.
  If you change setup, run it from a clean clone before calling it done.
- **Explanations belong in the README and in notebook prose**, not in long code comments. The code is
  the lesson; it should read as the clearest version of the idea.
- **No em dashes** in prose, per the house rules in
  `/Users/param/.claude/skills/lwp-shared/house-rules.md`.
- **Pin what you can.** A workshop that worked last term and breaks this term because an upstream
  package moved is the most common failure here.
