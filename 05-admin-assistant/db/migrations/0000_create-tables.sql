CREATE SCHEMA "admin_assistant";
--> statement-breakpoint
CREATE TABLE "admin_assistant"."changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"by" text NOT NULL,
	"action" text NOT NULL,
	"detail" jsonb NOT NULL,
	"made_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_assistant"."discount_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"percent_off" integer NOT NULL,
	"duration" text NOT NULL,
	"months" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"asked_by" text NOT NULL,
	"decided_by" text,
	"coupon_id" text,
	"promotion_code_id" text,
	"link" text,
	"problem" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "admin_assistant"."newsletters" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"previous_subject" text,
	"previous_body" text,
	"written_by" text NOT NULL,
	"approved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_assistant"."team" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
