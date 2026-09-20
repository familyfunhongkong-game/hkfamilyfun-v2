begin;

alter function public.enforce_event_image_limit() set search_path = public;
alter function public.enforce_event_submission_requirements() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.prevent_merchant_controlled_fields_change() set search_path = public;
alter function public.auto_fill_event_cover_before_submit() set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.rls_auto_enable() set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

commit;
