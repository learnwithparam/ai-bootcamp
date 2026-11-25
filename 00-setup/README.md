# Set up once

You set up once. Every product in this repo then runs with one command.

## Why

Each product calls a real model, saves to a real Postgres and records every run in Langfuse.
Setup starts those services on your machine and creates the tables.

## Before you start

You need three things:

- [Bun](https://bun.sh) 1.4 or newer. Check with `bun --version`.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), running. Check with `docker info`.
- An [OpenRouter key](https://openrouter.ai/keys). Each product's page shows what one run costs.

## Run it

```bash
git clone https://github.com/learnwithparam/ai-bootcamp.git
cd ai-bootcamp
bun install
cp .env.example .env
```

Open `.env` and paste your key after `OPENROUTER_API_KEY=`. Then run:

```bash
bun run setup
```

Expect: setup writes the other secrets into `.env`, starts Postgres and Langfuse, creates the tables and loads sample data.
The first run downloads the Docker images, so it takes a few minutes.

```bash
bun run dev
```

Open http://localhost:3100. You see the list of products. Start with the first one.

## What runs where

| Address | What it is |
|---|---|
| http://localhost:3100 | The gallery: every product, in order |
| http://localhost:3101 to 3110 | One product each, started with `bun run dev <product>` |
| http://localhost:3000 | Langfuse. Sign in with the email and password in `.env` to read each run. |
| localhost:5433 | Postgres for the products |

## The commands

| Command | What it does |
|---|---|
| `bun run setup` | Everything above. Safe to run again. |
| `bun run dev <product>` | Starts one product, for example `bun run dev invoice-inbox` |
| `bun run seed <product>` | Loads that product's sample data again |
| `bun run proof <product>` | Runs that product's tests against the real model |
| `bun run check` | The checks every change must pass |

## When something goes wrong

- **"OPENROUTER_API_KEY is not set"**: add your key to `.env`, then run setup again.
- **"Cannot connect to the Docker daemon"**: start Docker Desktop, then run setup again.
- **A port is in use**: stop the other app on that port. Run `lsof -i :3100` to find it.
