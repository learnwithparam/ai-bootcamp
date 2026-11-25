CREATE TABLE "site_assistant"."members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "site_assistant"."support_team" (
	"user_id" text PRIMARY KEY NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
