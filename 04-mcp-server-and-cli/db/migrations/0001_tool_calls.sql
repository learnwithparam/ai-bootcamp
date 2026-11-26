CREATE TABLE "mcp_server"."tool_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"via" text NOT NULL,
	"client_id" text,
	"tool" text NOT NULL,
	"input" jsonb NOT NULL,
	"outcome" text NOT NULL,
	"message" text,
	"ms" integer NOT NULL,
	"called_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tool_calls_user" ON "mcp_server"."tool_calls" USING btree ("user_id","called_at");