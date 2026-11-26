CREATE SCHEMA "coding_agent";
--> statement-breakpoint
CREATE TABLE "coding_agent"."members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coding_agent"."reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"reviewer_id" text NOT NULL,
	"verdict" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coding_agent"."runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"task" text NOT NULL,
	"repo" text NOT NULL,
	"commit" text NOT NULL,
	"check_command" text NOT NULL,
	"outcome" text NOT NULL,
	"reason" text NOT NULL,
	"steps" integer NOT NULL,
	"cost" double precision NOT NULL,
	"blocked" integer NOT NULL,
	"files_changed" integer NOT NULL,
	"diff" text NOT NULL,
	"check_before" jsonb,
	"check_after" jsonb,
	"events" jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coding_agent"."reviews" ADD CONSTRAINT "reviews_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "coding_agent"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_run" ON "coding_agent"."reviews" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "runs_uploaded" ON "coding_agent"."runs" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "runs_user" ON "coding_agent"."runs" USING btree ("user_id");