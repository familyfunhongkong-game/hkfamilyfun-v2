update public.events
set tags = replace(trim(both '{}' from tags), '"', ''),
    updated_at = now()
where tags is not null
  and tags like '{%}';
