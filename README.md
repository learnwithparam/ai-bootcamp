# AI Bootcamp

Ten AI products you can run, use and read. Each one is a complete product, built the way a team would ship it.
There are real model calls, a real database, real sign-in and tests that run against the real thing.

The ideas behind each product are taught in depth in the [live labs](https://www.learnwithparam.com/live).
This repo is where you see those ideas working together in a product.

## Start here

1. [Set up once](00-setup/README.md). It takes about ten minutes.
2. Work through the products in order. Each one adds a few ideas to the one before.

<!-- products:start -->
| # | Product | The job it does | Ideas it shows |
|---|---|---|---|
| 1 | [Invoice inbox](01-invoice-inbox/README.md) | Read supplier invoices and match each one to its purchase order. | structured output, verification, human in the loop |
| 2 | [Site assistant](02-site-assistant/README.md) | Answer visitors from the site's own pages, show members their plan, and hand off to a person. | loop, context, decision model, boundary, verification, human in the loop |
| 3 | [MCP server and CLI](04-mcp-server-and-cli/README.md) | Offer the school's catalog as one set of tools, used from chat, from Claude or Cursor, and from a terminal. | mcp, cli, boundary |
| 4 | [Admin assistant](05-admin-assistant/README.md) | Answer the owner's questions about signups, make Stripe coupons after approval, and draft the newsletter. | skills, ui the agent draws, human in the loop, boundary |
| 5 | [Research agent](06-research-agent/README.md) | Research a company on the live web, check every claim against its page, and score it as a lead. | graph, verification, structured output |
| 6 | [Legal intake](07-legal-intake/README.md) | Take a client's request, check it for conflicts, and wait for a lawyer to decide, even across a restart. | graph, human in the loop, boundary, verification |
| 7 | [Browser agent](08-browser-agent/README.md) | Turn client emails into requests on the firm's intake portal, and let a decision model say when to send. | browser automation, decision model, boundary, verification, human in the loop |
<!-- products:end -->

## How each product folder is laid out

Every product folder has the same shape. Once you have read one, you know where everything is in the others.

| Folder | What is in it |
|---|---|
| `README.md` | The learner page. Read it first, then follow its reading list. |
| `agent/` | The AI part. `agent.ts` is the entry point. |
| `rules/` | The business logic. It has no AI in it, so you can test it on its own. |
| `db/` | The tables, the queries and the sample data. |
| `app/` | The web pages and API routes. They stay thin and call the agent and the rules. |
| `components/` | The product's screens. |
| `tests/` | Tests for the rules, and tests that run the agent against the real model. |

Shared code lives in `packages/`. Each piece is one short file: the model setting, the database, sign-in, tracing and the theme.

## Earlier version

The Python demos this repo used to hold are kept at the [`v1-python`](https://github.com/learnwithparam/ai-bootcamp/tree/v1-python) tag.
