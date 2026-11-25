CREATE SCHEMA "mcp_server";
--> statement-breakpoint
CREATE TABLE "mcp_server"."cli_client" (
	"client_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_server"."items" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"date" text,
	"duration" text,
	"summary" text NOT NULL,
	CONSTRAINT "items_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "mcp_server"."saved" (
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_user_id_url_pk" PRIMARY KEY("user_id","url")
);
--> statement-breakpoint
ALTER TABLE "mcp_server"."saved" ADD CONSTRAINT "saved_url_items_url_fk" FOREIGN KEY ("url") REFERENCES "mcp_server"."items"("url") ON DELETE cascade ON UPDATE no action;