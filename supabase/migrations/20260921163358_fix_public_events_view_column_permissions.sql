grant select (hidden_pending_confirmation) on public.events to anon;
notify pgrst, 'reload schema';
