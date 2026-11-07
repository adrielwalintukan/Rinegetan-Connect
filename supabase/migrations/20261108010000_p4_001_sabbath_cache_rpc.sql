-- This gate cannot be enabled by an application role. P4-005 must replace it after rights approval.
create function private.sabbath_cache_rights_approved()
returns boolean
language sql stable
set search_path = ''
as $$ select false $$;
revoke all on function private.sabbath_cache_rights_approved() from public, anon, authenticated, service_role;

create function private.sabbath_cache_payload_valid(p_source_id text, p_payload jsonb)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_payload) is distinct from 'object'
    or jsonb_typeof(p_payload->'id') is distinct from 'string'
    or length(btrim(p_payload->>'id')) = 0
    or jsonb_typeof(p_payload->'index') is distinct from 'string'
    or (p_payload->>'index') is distinct from p_source_id
    or (p_payload->>'language') is distinct from 'id'
    or jsonb_typeof(p_payload->'title') is distinct from 'string'
    or length(btrim(p_payload->>'title')) = 0
    or jsonb_typeof(p_payload->'cover') is distinct from 'string'
    or (p_payload->>'cover') !~ '^https://[^/?#@]+'
    or (p_payload->>'cover') ~ '^https://[^/?#]*@'
    or jsonb_typeof(p_payload->'credits') is distinct from 'array'
    or jsonb_typeof(p_payload->'lessons') is distinct from 'array' then
    return false;
  end if;
  if jsonb_array_length(p_payload->'credits') = 0 or jsonb_array_length(p_payload->'lessons') = 0 then
    return false;
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_payload->'credits') as c(value)
    where jsonb_typeof(c.value) is distinct from 'object'
      or jsonb_typeof(c.value->'name') is distinct from 'string' or length(btrim(c.value->>'name')) = 0
      or jsonb_typeof(c.value->'value') is distinct from 'string' or length(btrim(c.value->>'value')) = 0
  ) or exists (
    select 1 from jsonb_array_elements(p_payload->'lessons') with ordinality as l(value, position)
    where jsonb_typeof(l.value) is distinct from 'object'
      or jsonb_typeof(l.value->'id') is distinct from 'string' or length(btrim(l.value->>'id')) = 0
      or jsonb_typeof(l.value->'index') is distinct from 'string' or length(btrim(l.value->>'index')) = 0
      or jsonb_typeof(l.value->'title') is distinct from 'string' or length(btrim(l.value->>'title')) = 0
      or (l.value->'position') is distinct from to_jsonb(l.position)
  ) then
    return false;
  end if;
  return (select count(*) = count(distinct l.value->>'id')
      and count(*) = count(distinct l.value->>'index')
    from jsonb_array_elements(p_payload->'lessons') as l(value));
end;
$$;
revoke all on function private.sabbath_cache_payload_valid(text, jsonb) from public, anon, authenticated, service_role;

create function public.sabbath_cache_read(p_source_id text)
returns table (source_id text, source_version text, fetched_at timestamptz, etag text, payload jsonb)
language plpgsql security definer
set search_path = ''
as $$
begin
  if not coalesce(private.is_admin(), false) or not coalesce(private.sabbath_cache_rights_approved(), false) then
    raise insufficient_privilege using message = 'sabbath_cache_unavailable';
  end if;
  return query
    select c.source_id, c.source_version, c.fetched_at, c.etag, c.payload
    from private.sabbath_content_cache c
    where c.source_id = p_source_id and c.validation_status = 'valid';
end;
$$;

create function public.sabbath_cache_write(
  p_source_id text, p_source_version text, p_fetched_at timestamptz, p_etag text, p_payload jsonb
)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_written integer;
begin
  if not coalesce(private.is_admin(), false) or not coalesce(private.sabbath_cache_rights_approved(), false) then
    raise insufficient_privilege using message = 'sabbath_cache_unavailable';
  end if;
  if not coalesce(private.sabbath_cache_payload_valid(p_source_id, p_payload), false) then
    raise check_violation using message = 'sabbath_cache_payload_invalid';
  end if;
  insert into private.sabbath_content_cache as c (source_id, source_version, fetched_at, etag, payload)
  values (p_source_id, p_source_version, p_fetched_at, p_etag, p_payload)
  on conflict (source_id) do update
    set source_version = excluded.source_version, fetched_at = excluded.fetched_at,
        etag = excluded.etag, payload = excluded.payload, validation_status = 'valid'
    where excluded.fetched_at > c.fetched_at;
  get diagnostics v_written = row_count;
  return v_written = 1;
end;
$$;

revoke all on function public.sabbath_cache_read(text) from public, anon, service_role;
revoke all on function public.sabbath_cache_write(text, text, timestamptz, text, jsonb) from public, anon, service_role;
grant execute on function public.sabbath_cache_read(text) to authenticated;
grant execute on function public.sabbath_cache_write(text, text, timestamptz, text, jsonb) to authenticated;
