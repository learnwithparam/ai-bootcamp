CREATE SCHEMA "personal_storefront";
--> statement-breakpoint
CREATE TABLE "personal_storefront"."basket_items" (
	"owner" text NOT NULL,
	"code" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "basket_items_owner_code_pk" PRIMARY KEY("owner","code")
);
--> statement-breakpoint
CREATE TABLE "personal_storefront"."personalizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" text NOT NULL,
	"said" text NOT NULL,
	"reply" text NOT NULL,
	"profile" jsonb NOT NULL,
	"sections" jsonb NOT NULL,
	"removed" jsonb NOT NULL,
	"dropped" jsonb NOT NULL,
	"proposal" jsonb,
	"tool_call_id" text,
	"basket" text DEFAULT 'none' NOT NULL,
	"cost_usd" real NOT NULL,
	"seconds" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_storefront"."products" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"quantity" text NOT NULL,
	"aisle" text NOT NULL,
	"image" text NOT NULL,
	"allergens" text[] NOT NULL,
	"traces" text[] NOT NULL,
	"diet" text NOT NULL,
	"nutriscore" text NOT NULL,
	"price_pence" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_storefront"."profiles" (
	"owner" text PRIMARY KEY NOT NULL,
	"profile" jsonb NOT NULL,
	"sections" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_storefront"."section_types" (
	"type" text PRIMARY KEY NOT NULL,
	"enabled" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_storefront"."team" (
	"user_id" text PRIMARY KEY NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
