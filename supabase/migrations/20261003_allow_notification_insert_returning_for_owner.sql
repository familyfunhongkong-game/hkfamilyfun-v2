-- HK Family Fun V2
-- Allow merchants to read only admin-bound notifications they created themselves.
-- Required for INSERT ... RETURNING under RLS.

drop policy if exists "Merchants can read own queued admin notifications"
on public.platform_notifications;

create policy "Merchants can read own queued admin notifications"
on public.platform_notifications
for select
to authenticated
using (
  recipient_scope = 'admin'
  and actor_user_id = auth.uid()
);
