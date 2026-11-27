# AI Bootcamp

AI products a learner can run, use and read, in TypeScript on Bun, Next.js and Postgres.
Each numbered folder is one complete product. Its README is the learner page.

## Running it

Run every command from the repo root, so Bun loads the root environment file.

```bash
bun run setup                  # Postgres and Langfuse in Docker, migrations, seed data
bun run dev invoice-inbox      # one web product on its own port (3101 to 3112)
bun run seed invoice-inbox     # load that product's sample data again
bun run check                  # types, Biome, structure, learner pages, controls, prose, unit tests
bun run proof invoice-inbox    # the real-model and browser tests behind each page's "Prove it"
```

## Rules

Each rule below is enforced by `bun run check` (scripts named in brackets) unless it says otherwise.

- **Never break the first-run path.** A learner hitting an error in step one abandons the course.
  If you change setup, run it from a clean clone before calling it done.
- **Nothing faked.** Real model calls, real Postgres, real sign-in through better-auth, seed data made
  through the real paths. No mock model, no fixture posing as data, no `catch` that returns a made-up answer
  (`check-products.ts`). A `catch` rethrows or logs with `console.error` (`check-structure.ts`).
- **One folder shape.** `agent/`, `rules/`, `db/`, `app/`, `components/`, `tests/`. Imports go
  `app → agent → rules/db`, `rules/` never imports the model, and products never import each other.
  Files stay under 200 lines and functions under 40 (`check-structure.ts`).
- **The learner page is complete.** Every README has the sections from Why to Learn the idea in depth,
  a "Who uses it" table, a screenshot that exists for every image, and a reading list of files that exist
  (`check-products.ts`). The root product table is generated: `bun scripts/check-products.ts --write`.
- **Products are listed once**, in `packages/products/products.ts`. Ports, folders and the table read it.
- **Shared UI lives in `packages/ui`.** Form controls use its styles (`check-controls.ts`), and pages never
  show raw markdown or a raw tool id (`packages/ui/check-page.ts`, run by each product's e2e test).
- **Plain English, no em dashes** in prose (`check-prose.ts`).
- **Pin exact versions.** A course that worked last term and breaks this term because a package moved is
  the most common failure here. Vet a package before adding it.
- **No model name in a product's UI.** Not checked; review for it.

## Where this repo differs from the engineering standard

`03-voice-assistant/components/agents-ui/` is LiveKit's Agents UI, copied from agent-starter-react as its
registry ships it. The size and colour rules skip it (`check-structure.ts`), and Biome turns off five lint
rules for it (`biome.json`), so an update from LiveKit stays a copy, not a hand merge. Every other rule applies.

## Older versions

The Python demos are kept at the `v1-python` tag.
