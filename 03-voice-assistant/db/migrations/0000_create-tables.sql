CREATE SCHEMA "voice_assistant";
--> statement-breakpoint
CREATE TABLE "voice_assistant"."bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"physio_id" text NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"caller_name" text NOT NULL,
	"phone" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'booked' NOT NULL,
	"call_id" uuid,
	"booked_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_assistant"."calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caller" text NOT NULL,
	"status" text DEFAULT 'live' NOT NULL,
	"ended_because" text,
	"seconds" real NOT NULL,
	"cost_usd" real NOT NULL,
	"usage" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "voice_assistant"."lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_assistant"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid,
	"caller_name" text NOT NULL,
	"phone" text NOT NULL,
	"note" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_assistant"."physios" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"focus" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_assistant"."team" (
	"user_id" text PRIMARY KEY NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voice_assistant"."bookings" ADD CONSTRAINT "bookings_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "voice_assistant"."calls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_assistant"."lines" ADD CONSTRAINT "lines_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "voice_assistant"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_assistant"."messages" ADD CONSTRAINT "messages_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "voice_assistant"."calls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_booking_per_slot" ON "voice_assistant"."bookings" USING btree ("physio_id","start") WHERE status = 'booked';