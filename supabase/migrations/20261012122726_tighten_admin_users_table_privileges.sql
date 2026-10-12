revoke all privileges on table public.admin_users from anon;
revoke all privileges on table public.admin_users from authenticated;
grant select on table public.admin_users to authenticated;
grant all privileges on table public.admin_users to service_role;
