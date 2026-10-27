-- Already applied to production via Supabase migration 20261026015047.
-- Row Level Security does not guard TRUNCATE; web roles never need
-- TRUNCATE, TRIGGER, or REFERENCES for normal event and profile CRUD.
-- Keep the migration drift lock (GitHub issue #52) in place.
REVOKE TRUNCATE, TRIGGER, REFERENCES
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;
