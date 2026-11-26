CREATE SCHEMA "research_agent";
--> statement-breakpoint
CREATE TABLE "research_agent"."reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"created_by" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"step" text DEFAULT 'Starting' NOT NULL,
	"identity" jsonb,
	"claims" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"facts" jsonb,
	"score" jsonb,
	"cost" double precision DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "reports_created_by" ON "research_agent"."reports" USING btree ("created_by","created_at");