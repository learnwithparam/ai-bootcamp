CREATE SCHEMA "team_workspace";
--> statement-breakpoint
CREATE TABLE "team_workspace"."chats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_workspace"."connections" (
	"connector_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"tokens" text,
	"code_verifier" text,
	"state" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connections_connector_id_user_id_pk" PRIMARY KEY("connector_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "team_workspace"."connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"url" text NOT NULL,
	"issuer" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"added_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connectors_name_unique" UNIQUE("name"),
	CONSTRAINT "connectors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team_workspace"."members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_workspace"."memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"chat_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_workspace"."messages" (
	"chat_id" uuid NOT NULL,
	"id" text NOT NULL,
	"seq" integer NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	CONSTRAINT "messages_chat_id_id_pk" PRIMARY KEY("chat_id","id")
);
--> statement-breakpoint
ALTER TABLE "team_workspace"."connections" ADD CONSTRAINT "connections_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "team_workspace"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_workspace"."memories" ADD CONSTRAINT "memories_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "team_workspace"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_workspace"."messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "team_workspace"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chats_by_user" ON "team_workspace"."chats" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "memories_by_user" ON "team_workspace"."memories" USING btree ("user_id");