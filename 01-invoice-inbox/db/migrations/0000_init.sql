CREATE SCHEMA "invoice_inbox";
--> statement-breakpoint
CREATE TYPE "invoice_inbox"."invoice_status" AS ENUM('matched', 'exception', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "invoice_inbox"."invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"pdf" "bytea" NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"extracted" jsonb NOT NULL,
	"problems" jsonb NOT NULL,
	"status" "invoice_inbox"."invoice_status" NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"note" text
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
	"ordered_on" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_inbox"."order_lines" ADD CONSTRAINT "order_lines_order_number_purchase_orders_order_number_fk" FOREIGN KEY ("order_number") REFERENCES "invoice_inbox"."purchase_orders"("order_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_status" ON "invoice_inbox"."invoices" USING btree ("status","uploaded_at");