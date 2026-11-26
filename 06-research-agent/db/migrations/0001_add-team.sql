CREATE TABLE "research_agent"."members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'rep' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_agent"."reports" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "research_agent"."reports" ADD COLUMN "topics_done" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "reports_owner" ON "research_agent"."reports" USING btree ("owner_id");