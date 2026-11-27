CREATE SCHEMA "marketplace_analyst";
--> statement-breakpoint
CREATE SCHEMA "marketplace";
--> statement-breakpoint
CREATE TABLE "marketplace_analyst"."conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_analyst"."eval_results" (
	"run_id" integer NOT NULL,
	"case_id" text NOT NULL,
	"question" text NOT NULL,
	"passed" boolean NOT NULL,
	"scores" jsonb NOT NULL,
	"detail" jsonb NOT NULL,
	CONSTRAINT "eval_results_run_id_case_id_pk" PRIMARY KEY("run_id","case_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace_analyst"."eval_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" jsonb NOT NULL,
	"passed" boolean NOT NULL,
	"cost_usd" numeric(10, 6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_analyst"."messages" (
	"conversation_id" text NOT NULL,
	"id" text NOT NULL,
	"seq" integer NOT NULL,
	"message" jsonb NOT NULL,
	CONSTRAINT "messages_conversation_id_id_pk" PRIMARY KEY("conversation_id","id")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."customers" (
	"customer_id" text PRIMARY KEY NOT NULL,
	"customer_unique_id" text NOT NULL,
	"zip_prefix" text,
	"city" text,
	"state" text
);
--> statement-breakpoint
CREATE TABLE "marketplace"."order_items" (
	"order_id" text NOT NULL,
	"item_number" integer NOT NULL,
	"product_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"shipping_limit_at" timestamp,
	"price" numeric(12, 2) NOT NULL,
	"freight" numeric(12, 2) NOT NULL,
	CONSTRAINT "order_items_order_id_item_number_pk" PRIMARY KEY("order_id","item_number")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."orders" (
	"order_id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"status" text NOT NULL,
	"purchased_at" timestamp NOT NULL,
	"approved_at" timestamp,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"estimated_delivery_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "marketplace"."payments" (
	"order_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"type" text NOT NULL,
	"installments" integer NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	CONSTRAINT "payments_order_id_sequence_pk" PRIMARY KEY("order_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."products" (
	"product_id" text PRIMARY KEY NOT NULL,
	"category" text,
	"name_length" integer,
	"description_length" integer,
	"photos" integer,
	"weight_g" integer,
	"length_cm" integer,
	"height_cm" integer,
	"width_cm" integer
);
--> statement-breakpoint
CREATE TABLE "marketplace"."reviews" (
	"review_id" text NOT NULL,
	"order_id" text NOT NULL,
	"score" integer NOT NULL,
	"title" text,
	"message" text,
	"created_at" timestamp,
	"answered_at" timestamp,
	CONSTRAINT "reviews_review_id_order_id_pk" PRIMARY KEY("review_id","order_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."sellers" (
	"seller_id" text PRIMARY KEY NOT NULL,
	"zip_prefix" text,
	"city" text,
	"state" text
);
--> statement-breakpoint
ALTER TABLE "marketplace_analyst"."eval_results" ADD CONSTRAINT "eval_results_run_id_eval_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "marketplace_analyst"."eval_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_analyst"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "marketplace_analyst"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_user" ON "marketplace_analyst"."conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_order" ON "marketplace_analyst"."messages" USING btree ("conversation_id","seq");--> statement-breakpoint
CREATE INDEX "order_items_product" ON "marketplace"."order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_customer" ON "marketplace"."orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_purchased" ON "marketplace"."orders" USING btree ("purchased_at");--> statement-breakpoint
CREATE INDEX "reviews_order" ON "marketplace"."reviews" USING btree ("order_id");