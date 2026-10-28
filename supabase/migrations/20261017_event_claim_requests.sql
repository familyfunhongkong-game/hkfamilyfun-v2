-- Event claims are requests, never automatic ownership transfers.
create table if not exists public.event_claim_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  claimant_user_id uuid not null references auth.users(id) on delete cascade,
  organization_name text not null check (char_length(trim(organization_name)) between 2 and 160),
  contact_name text not null check (char_length(trim(contact_name)) between 2 and 120),
  official_email text not null check (char_length(official_email) between 5 and 254),
  evidence_url text check (evidence_url is null or char_length(evidence_url) <= 1000),
  explanation text not null check (char_length(trim(explanation)) between 12 and 2000),
  image_note text check (image_note is null or char_length(image_note) <= 1000),
  rights_confirmed boolean not null default false check (rights_confirmed),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists event_claim_requests_one_pending
  on public.event_claim_requests(event_id, claimant_user_id) where status='pending';
create index if not exists event_claim_requests_status_created on public.event_claim_requests(status,created_at desc);
alter table public.event_claim_requests enable row level security;
revoke all on public.event_claim_requests from anon;
grant select, insert on public.event_claim_requests to authenticated;
create policy "claimants read own requests" on public.event_claim_requests
  for select to authenticated using (claimant_user_id = (select auth.uid()));
create policy "claimants submit pending requests" on public.event_claim_requests
  for insert to authenticated with check (
    claimant_user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null and reviewed_at is null and review_note is null
    and exists(select 1 from public.events e where e.id=event_id and e.status='published')
  );
-- Reviewing must occur through a trusted server-side admin workflow; the client
-- cannot update requests or public.events ownership.
