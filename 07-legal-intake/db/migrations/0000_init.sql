CREATE SCHEMA "legal_intake";
--> statement-breakpoint
CREATE TABLE "legal_intake"."intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"other_parties" jsonb NOT NULL,
	"story" text NOT NULL,
	"status" text DEFAULT 'assessing' NOT NULL,
	"assessment" jsonb,
	"conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"decision" jsonb,
	"draft" text,
	"letter" text,
	"cost" double precision DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	CONSTRAINT "intakes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "legal_intake"."lawyers" (
	"user_id" text PRIMARY KEY NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_intake"."parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"matter" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "intakes_status" ON "legal_intake"."intakes" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "intakes_email" ON "legal_intake"."intakes" USING btree ("client_email");