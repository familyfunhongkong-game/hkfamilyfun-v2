update public.events
set status = 'archived',
    admin_review_note = coalesce(admin_review_note, '') ||
      case when coalesce(admin_review_note, '') = '' then '' else E'\n' end ||
      'Archived during pre-launch QA: demo/sample record, not a verified production event.',
    updated_at = now()
where id = 'bbbb3e2a-ea80-4acb-a70d-989b0f8577e2'
  and status = 'published';
