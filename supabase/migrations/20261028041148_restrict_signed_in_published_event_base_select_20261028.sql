-- HKFF V2 production migration 20261028041148, ALREADY applied and independently verified.
-- Do not run routine supabase db push: repository Issue #52 migration history drift lock remains.
-- Public catalogue uses a dedicated anon-only Supabase client; users who sign in
-- do not gain SELECT of internal review notes on unrelated published event rows.
-- Merchant-own and admin-all policies remain unchanged.
-- Source staging procedure was tested with anonymous, merchant, admin and outsider
-- personas in a rolled-back SQL transaction prior to production application.
ALTER POLICY "Public can view published events"
  ON public.events TO anon;
