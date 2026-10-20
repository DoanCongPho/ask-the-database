-- Read-only login for the app. Run as postgres after loading seed.sql (safe to re-run):
--   docker exec -i shop-db psql -U postgres -d shop < db/readonly_role.sql
-- It only adds a role and grants. It does not touch any table data.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shop_reader') THEN
    CREATE ROLE shop_reader LOGIN PASSWORD 'shop_reader';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE shop TO shop_reader;
GRANT USAGE ON SCHEMA public TO shop_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO shop_reader;
-- seed.sql drops and recreates the tables; keep SELECT on the new ones too.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO shop_reader;

-- Even if a write slipped past the app, the session itself refuses it.
ALTER ROLE shop_reader SET default_transaction_read_only = on;
ALTER ROLE shop_reader SET statement_timeout = '5s';
