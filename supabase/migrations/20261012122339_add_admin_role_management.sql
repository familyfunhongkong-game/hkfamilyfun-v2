create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  role text not null default 'admin' check (role in ('admin','super_admin')),
  status text not null default 'active' check (status in ('active','disabled')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz,
  last_role_changed_by uuid references auth.users(id) on delete set null,
  last_role_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_email_lowercase check (email = lower(email))
);

create unique index if not exists admin_users_email_unique_ci
  on public.admin_users (lower(email));

alter table public.admin_users enable row level security;

create schema if not exists private;

create or replace function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.status = 'active'
      and (
        a.user_id = auth.uid()
        or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function private.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.status = 'active'
      and a.role = 'super_admin'
      and (
        a.user_id = auth.uid()
        or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

revoke all on function private.current_user_is_admin() from public;
revoke all on function private.current_user_is_super_admin() from public;
grant execute on function private.current_user_is_admin() to authenticated, service_role;
grant execute on function private.current_user_is_super_admin() to authenticated, service_role;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.current_user_is_admin();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.current_user_is_super_admin();
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_super_admin() from public;
revoke execute on function public.is_platform_admin() from anon;
revoke execute on function public.is_super_admin() from anon;
grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.is_super_admin() to authenticated, service_role;

drop policy if exists "Admin users can read own membership" on public.admin_users;
create policy "Admin users can read own membership"
on public.admin_users
for select
to authenticated
using (
  status = 'active'
  and (
    user_id = (select auth.uid())
    or lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
);

update public.admin_users a
set
  user_id = u.id,
  role = 'super_admin',
  status = 'active',
  updated_at = now(),
  last_role_changed_at = now()
from auth.users u
where lower(u.email) = 'familyfun.hongkong@gmail.com'
  and lower(a.email) = 'familyfun.hongkong@gmail.com';

insert into public.admin_users (
  user_id, email, role, status, invited_at, last_role_changed_at
)
select
  u.id,
  lower(u.email),
  'super_admin',
  'active',
  now(),
  now()
from auth.users u
where lower(u.email) = 'familyfun.hongkong@gmail.com'
  and not exists (
    select 1 from public.admin_users a
    where lower(a.email) = 'familyfun.hongkong@gmail.com'
  );
