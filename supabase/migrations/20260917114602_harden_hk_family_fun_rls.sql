begin;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (
    array[
      'familyfun.hongkong@gmail.com'::text,
      'info@hkfamilyfun.com'::text
    ]
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.guard_merchant_sensitive_update()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
  if current_user in ('postgres', 'supabase_admin')
     or auth.role() = 'service_role'
     or public.is_platform_admin() then
    return new;
  end if;

  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'Merchant owner cannot be changed by merchant user';
  end if;

  if new.status is distinct from old.status then
    raise exception 'Merchant status can only be changed by platform admin';
  end if;

  if new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Merchant review fields can only be changed by platform admin';
  end if;

  return new;
end;
$$;

create or replace function public.guard_event_merchant_update()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
  if current_user in ('postgres', 'supabase_admin')
     or auth.role() = 'service_role'
     or public.is_platform_admin() then
    return new;
  end if;

  if new.merchant_id is distinct from old.merchant_id then
    raise exception 'Event merchant ownership cannot be changed by merchant user';
  end if;

  if old.status not in ('draft', 'rejected') then
    raise exception 'Only draft or rejected events can be edited by merchant';
  end if;

  if new.status not in ('draft', 'submitted') then
    raise exception 'Merchant can only keep event as draft or submit it for review';
  end if;

  if new.approved_at is distinct from old.approved_at
     or new.published_at is distinct from old.published_at
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.rejected_at is distinct from old.rejected_at
     or new.rejection_reason is distinct from old.rejection_reason
     or new.admin_review_note is distinct from old.admin_review_note
     or new.is_featured is distinct from old.is_featured then
    raise exception 'Admin review fields cannot be changed by merchant';
  end if;

  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    new.submitted_at := coalesce(new.submitted_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_merchant_sensitive_update on public.merchants;
create trigger trg_guard_merchant_sensitive_update
before update on public.merchants
for each row execute function public.guard_merchant_sensitive_update();

drop trigger if exists trg_guard_event_merchant_update on public.events;
create trigger trg_guard_event_merchant_update
before update on public.events
for each row execute function public.guard_event_merchant_update();

-- Remove overlapping / legacy event policies.
drop policy if exists "Admins can read all events" on public.events;
drop policy if exists "Admins can update all events" on public.events;
drop policy if exists "Approved merchant can create event drafts" on public.events;
drop policy if exists "Approved merchant can delete own drafts" on public.events;
drop policy if exists "Approved merchant can edit own drafts" on public.events;
drop policy if exists "Merchant can create own draft events" on public.events;
drop policy if exists "Merchant can update own draft events" on public.events;
drop policy if exists "Merchant can view own events" on public.events;
drop policy if exists "Public can view published events" on public.events;

create policy "Public can view published events"
on public.events
for select
to anon, authenticated
using (status = 'published');

create policy "Merchant can view own events"
on public.events
for select
to authenticated
using (
  exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = auth.uid()
  )
);

create policy "Merchant can create own draft events"
on public.events
for insert
to authenticated
with check (
  status = 'draft'
  and exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
  )
);

create policy "Merchant can update own draft or rejected events"
on public.events
for update
to authenticated
using (
  status in ('draft', 'rejected')
  and exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
  )
)
with check (
  status in ('draft', 'submitted')
  and exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
  )
);

create policy "Merchant can delete own drafts"
on public.events
for delete
to authenticated
using (
  status = 'draft'
  and exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
  )
);

create policy "Platform admin can read all events"
on public.events
for select
to authenticated
using (public.is_platform_admin());

create policy "Platform admin can insert events"
on public.events
for insert
to authenticated
with check (public.is_platform_admin());

create policy "Platform admin can update all events"
on public.events
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform admin can delete events"
on public.events
for delete
to authenticated
using (public.is_platform_admin());

-- Harden merchant account policies.
drop policy if exists "Merchant owner can update own merchant profile" on public.merchants;
drop policy if exists "Merchant owner can view own merchant profile" on public.merchants;
drop policy if exists "User can create own merchant profile" on public.merchants;

create policy "Merchant owner can view own merchant profile"
on public.merchants
for select
to authenticated
using (owner_user_id = auth.uid());

create policy "User can create own merchant profile"
on public.merchants
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and status = 'pending'
);

create policy "Merchant owner can update own merchant profile"
on public.merchants
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "Platform admin can read all merchants"
on public.merchants
for select
to authenticated
using (public.is_platform_admin());

create policy "Platform admin can update merchants"
on public.merchants
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- Keep profile self-service policies as-is; add admin read access only.
drop policy if exists "Platform admin can read all profiles" on public.profiles;
create policy "Platform admin can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_platform_admin());

commit;
