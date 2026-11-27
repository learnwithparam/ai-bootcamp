DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'marketplace_reader') THEN
    CREATE ROLE marketplace_reader LOGIN PASSWORD 'marketplace_reader';
  END IF;
END $$;--> statement-breakpoint
ALTER ROLE marketplace_reader SET default_transaction_read_only = on;--> statement-breakpoint
ALTER ROLE marketplace_reader SET statement_timeout = '8s';--> statement-breakpoint
ALTER ROLE marketplace_reader SET search_path = marketplace;--> statement-breakpoint
GRANT USAGE ON SCHEMA marketplace TO marketplace_reader;--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA marketplace TO marketplace_reader;
