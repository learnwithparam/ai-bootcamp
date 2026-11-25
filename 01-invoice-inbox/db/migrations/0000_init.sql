CREATE SCHEMA "invoice_inbox";
--> statement-breakpoint
CREATE TYPE "invoice_inbox"."bill_status" AS ENUM('reading', 'unreadable', 'review', 'hold', 'approval', 'payment', 'paid', 'rejected');--> statement-breakpoint
CREATE TABLE "invoice_inbox"."bill_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_inbox"."bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"pdf" "bytea" NOT NULL,
	"uploaded_by" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "invoice_inbox"."bill_status" DEFAULT 'reading' NOT NULL,
	"extracted" jsonb,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"problems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fix" jsonb,
	"pay_cents" integer,
	"duplicate_of" uuid
);
--> statement-breakpoint
CREATE TABLE "invoice_inbox"."members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'clerk' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_inbox"."order_lines" (
	"order_number" integer NOT NULL,
	"product" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"discount_percent" integer NOT NULL,
	CONSTRAINT "order_lines_order_number_product_pk" PRIMARY KEY("order_number","product")
);
--> statement-breakpoint
CREATE TABLE "invoice_inbox"."purchase_orders" (
	"order_number" integer PRIMARY KEY NOT NULL,
	"customer" text NOT NULL,
	"ordered_on" date NOT NULL,
	"shipped_on" date
);
--> statement-breakpoint
ALTER TABLE "invoice_inbox"."bill_events" ADD CONSTRAINT "bill_events_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "invoice_inbox"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_inbox"."order_lines" ADD CONSTRAINT "order_lines_order_number_purchase_orders_order_number_fk" FOREIGN KEY ("order_number") REFERENCES "invoice_inbox"."purchase_orders"("order_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bill_events_bill" ON "invoice_inbox"."bill_events" USING btree ("bill_id","at");--> statement-breakpoint
CREATE INDEX "bills_status" ON "invoice_inbox"."bills" USING btree ("status","received_at");