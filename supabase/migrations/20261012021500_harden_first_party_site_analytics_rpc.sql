revoke execute on function public.admin_site_analytics_summary(timestamptz) from authenticated;
grant execute on function public.admin_site_analytics_summary(timestamptz) to service_role;
