-- Re-sending the current status (retry, stale view) keeps the original handler and time;
-- the audit trigger skips same-status updates, so overwriting them would be unaudited.
create or replace function private.prepare_study_interest_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'new';
    new.handled_by := null;
    new.handled_at := null;
    new.created_at := now();
    new.consented_at := now();
    return new;
  end if;

  -- ON DELETE SET NULL of a removed handler is the only change allowed besides a status decision.
  if (to_jsonb(new) - 'handled_by') = (to_jsonb(old) - 'handled_by')
    and new.handled_by is null and old.handled_by is not null
    and not exists (select 1 from auth.users where id = old.handled_by)
  then
    return new;
  end if;

  if (to_jsonb(new) - array['status', 'handled_by', 'handled_at'])
    is distinct from (to_jsonb(old) - array['status', 'handled_by', 'handled_at']) then
    raise check_violation using message = 'study_interest_immutable';
  end if;
  if new.status = old.status then
    new.handled_by := old.handled_by;
    new.handled_at := old.handled_at;
    return new;
  end if;
  new.handled_by := auth.uid();
  new.handled_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_study_interest_lead() from public, anon, authenticated;
