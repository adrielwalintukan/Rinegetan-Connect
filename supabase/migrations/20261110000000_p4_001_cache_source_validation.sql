-- Keep existing deployments and fresh installs on the same validation boundary.
create or replace function private.sabbath_cache_payload_valid(p_source_id text, p_payload jsonb)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_payload) is distinct from 'object'
    or jsonb_typeof(p_payload->'id') is distinct from 'string'
    or not private.sabbath_cache_nonblank(p_payload->>'id')
    or p_source_id is distinct from ('id-' || (p_payload->>'id'))
    or jsonb_typeof(p_payload->'index') is distinct from 'string'
    or (p_payload->>'index') is distinct from p_source_id
    or (p_payload->>'language') is distinct from 'id'
    or jsonb_typeof(p_payload->'title') is distinct from 'string'
    or not private.sabbath_cache_nonblank(p_payload->>'title')
    or jsonb_typeof(p_payload->'cover') is distinct from 'string'
    or (p_payload->>'cover') !~ '^https://sabbath-school\.adventech\.io(:443)?/[^[:space:]\\]*$'
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
      or jsonb_typeof(c.value->'name') is distinct from 'string' or not private.sabbath_cache_nonblank(c.value->>'name')
      or jsonb_typeof(c.value->'value') is distinct from 'string' or not private.sabbath_cache_nonblank(c.value->>'value')
  ) or exists (
    select 1 from jsonb_array_elements(p_payload->'lessons') with ordinality as l(value, position)
    where jsonb_typeof(l.value) is distinct from 'object'
      or jsonb_typeof(l.value->'id') is distinct from 'string' or not private.sabbath_cache_nonblank(l.value->>'id')
      or jsonb_typeof(l.value->'index') is distinct from 'string' or not private.sabbath_cache_nonblank(l.value->>'index')
      or jsonb_typeof(l.value->'title') is distinct from 'string' or not private.sabbath_cache_nonblank(l.value->>'title')
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
