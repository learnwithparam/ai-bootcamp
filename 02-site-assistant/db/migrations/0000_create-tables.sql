-- Sections are searched by meaning with pgvector, which the Postgres image in compose.yaml ships with.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE SCHEMA "site_assistant";
--> statement-breakpoint
CREATE TABLE "site_assistant"."pages" (
	"url" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_assistant"."sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"heading" text NOT NULL,
	"body" text NOT NULL,
	"embedding" vector(1536) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_assistant"."tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"summary" text NOT NULL,
	"conversation" jsonb NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_by" text,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_assistant"."turns" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor" text NOT NULL,
	"action" text NOT NULL,
	"confidence" real NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT 0 NOT NULL,
	"cited_pages" integer DEFAULT 0 NOT NULL,
	"bad_citations" integer DEFAULT 0 NOT NULL,
	"asked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_assistant"."sections" ADD CONSTRAINT "sections_url_pages_url_fk" FOREIGN KEY ("url") REFERENCES "site_assistant"."pages"("url") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sections_embedding" ON "site_assistant"."sections" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "turns_visitor_time" ON "site_assistant"."turns" USING btree ("visitor","asked_at");