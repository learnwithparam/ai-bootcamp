CREATE SCHEMA "browser_agent";
--> statement-breakpoint
CREATE TABLE "browser_agent"."emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "browser_agent"."operators" (
	"user_id" text PRIMARY KEY NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "browser_agent"."runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_id" uuid NOT NULL,
	"status" text DEFAULT 'reading' NOT NULL,
	"form" jsonb,
	"placed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submit_selector" text,
	"problems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verdict" jsonb,
	"reason" text,
	"decided_by" text,
	"request_url" text,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"screen" text,
	"cost" double precision DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "browser_agent"."runs" ADD CONSTRAINT "runs_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "browser_agent"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "runs_email" ON "browser_agent"."runs" USING btree ("email_id","created_at");--> statement-breakpoint
CREATE INDEX "runs_status" ON "browser_agent"."runs" USING btree ("status");