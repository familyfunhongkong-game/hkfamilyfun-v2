-- Keep new community submissions visible to Admin without leaking drafts to public.
-- This migration runs only AFTER the three community tables and platform_notifications exist.
alter table public.platform_notifications drop constraint if exists platform_notifications_kind_check;
alter table public.platform_notifications add constraint platform_notifications_kind_check check (
  kind in (
    'merchant_registered','merchant_updated','event_created','event_updated',
    'event_submitted','event_status_changed','merchant_status_changed',
    'community_tip_submitted','community_reply_submitted'
  )
);

create or replace function public.notify_admin_community_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.platform_notifications(
    kind,recipient_scope,actor_user_id,title,message,status_snapshot,dedupe_key
  ) values (
    case when tg_table_name='community_tip_replies' then 'community_reply_submitted' else 'community_tip_submitted' end,
    'admin',new.author_id,
    case when tg_table_name='community_tip_replies' then '社區有新留言待審批' else '社區有新報料待審批' end,
    case when tg_table_name='community_tip_replies'
      then '新留言等待審核，請進入社區留言審批。'
      else left(coalesce(to_jsonb(new)->>'title','新社區投稿'),150) end,
    'pending','community:' || tg_table_name || ':' || new.id::text
  ) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.notify_admin_community_submission() from public, anon, authenticated;
drop trigger if exists notify_admin_new_community_tip on public.community_tips;
create trigger notify_admin_new_community_tip
after insert on public.community_tips
for each row execute function public.notify_admin_community_submission();
drop trigger if exists notify_admin_new_community_reply on public.community_tip_replies;
create trigger notify_admin_new_community_reply
after insert on public.community_tip_replies
for each row execute function public.notify_admin_community_submission();
