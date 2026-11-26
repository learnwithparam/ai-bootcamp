CREATE TABLE "site_assistant"."conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor" text NOT NULL,
	"user_id" text,
	"name" text,
	"email" text,
	"started_on" text NOT NULL,
	"owner" text DEFAULT 'assistant' NOT NULL,
	"summary" text,
	"handed_off_at" timestamp with time zone,
	"assignee_id" text,
	"assignee_name" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_assistant"."messages" (
	"conversation_id" text NOT NULL,
	"id" text NOT NULL,
	"seq" integer NOT NULL,
	"message" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_conversation_id_id_pk" PRIMARY KEY("conversation_id","id")
);
--> statement-breakpoint
ALTER TABLE "site_assistant"."turns" ADD COLUMN "conversation_id" text;--> statement-breakpoint
ALTER TABLE "site_assistant"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "site_assistant"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_visitor" ON "site_assistant"."conversations" USING btree ("visitor","updated_at");