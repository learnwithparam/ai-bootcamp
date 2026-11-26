CREATE TABLE "legal_intake"."conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_hash" text NOT NULL,
	"transcript" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"draft" jsonb NOT NULL,
	"turns" integer DEFAULT 0 NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"intake_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legal_intake"."intakes" ADD COLUMN "key_date" jsonb;--> statement-breakpoint
ALTER TABLE "legal_intake"."intakes" ADD COLUMN "goal" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "legal_intake"."intakes" ADD COLUMN "transcript" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "legal_intake"."lawyers" ADD COLUMN "role" text DEFAULT 'lawyer' NOT NULL;--> statement-breakpoint
CREATE INDEX "conversations_visitor" ON "legal_intake"."conversations" USING btree ("visitor_hash","created_at");