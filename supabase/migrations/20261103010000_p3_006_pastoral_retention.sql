-- P3-006: Admin-run retention purge and access audit for pastoral data.
-- No new tables, columns, or DELETE grants; rows leave only through purge_expired_pastoral_data().

-- Single source of the cut-off: 24 months minus 120 days so backup copies (max 90 days) also expire before 24 months.
create function private.pastoral_retention_cutoff()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() - interval '24 months' + interval '120 days' $$;

revoke all on function private.pastoral_retention_cutoff() from public, anon, authenticated, service_role;

create function public.expired_pastoral_counts()
returns table (study_interest_leads bigint, prayer_requests bigint, visitor_submissions bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := private.pastoral_retention_cutoff();
begin
  if not private.is_admin() then
    raise insufficient_privilege using message = 'pastoral_admin_only';
  end if;
  return query select
    (select count(*) from public.study_interest_leads where created_at < v_cutoff),
    (select count(*) from public.prayer_requests where created_at < v_cutoff),
    (select count(*) from public.visitor_submissions where created_at < v_cutoff);
end;
$$;

-- Audit carries counts and the cut-off only, never row ids or content; a zero-row run is still recorded as weekly evidence.
create function public.purge_expired_pastoral_data()
returns table (study_interest_leads bigint, prayer_requests bigint, visitor_submissions bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := private.pastoral_retention_cutoff();
  v_study bigint;
  v_prayer bigint;
  v_visit bigint;
begin
  if not private.is_admin() then
    raise insufficient_privilege using message = 'pastoral_admin_only';
  end if;
  with gone as (delete from public.study_interest_leads where created_at < v_cutoff returning 1) select count(*) into v_study from gone;
  with gone as (delete from public.prayer_requests where created_at < v_cutoff returning 1) select count(*) into v_prayer from gone;
  with gone as (delete from public.visitor_submissions where created_at < v_cutoff returning 1) select count(*) into v_visit from gone;
  insert into public.audit_logs (actor_id, action, entity_type, changes) values
    (auth.uid(), 'study_interest.purged', 'study_interest_leads', jsonb_build_object('deleted', v_study, 'cutoff', v_cutoff)),
    (auth.uid(), 'prayer_request.purged', 'prayer_requests', jsonb_build_object('deleted', v_prayer, 'cutoff', v_cutoff)),
    (auth.uid(), 'visitor_submission.purged', 'visitor_submissions', jsonb_build_object('deleted', v_visit, 'cutoff', v_cutoff));
  return query select v_study, v_prayer, v_visit;
end;
$$;

-- One row per portal load; counts are bounded by the 50-row portal view.
create function public.record_pastoral_access(p_study_interest integer, p_prayer integer, p_visit integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise insufficient_privilege using message = 'pastoral_admin_only';
  end if;
  if p_study_interest is null or p_prayer is null or p_visit is null
    or least(p_study_interest, p_prayer, p_visit) < 0 or greatest(p_study_interest, p_prayer, p_visit) > 50 then
    raise check_violation using message = 'pastoral_access_count_invalid';
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, changes)
  values (auth.uid(), 'pastoral.viewed', 'pastoral_data', jsonb_build_object(
    'study_interest_leads', p_study_interest, 'prayer_requests', p_prayer, 'visitor_submissions', p_visit));
end;
$$;

revoke all on function public.expired_pastoral_counts() from public, anon, service_role;
revoke all on function public.purge_expired_pastoral_data() from public, anon, service_role;
revoke all on function public.record_pastoral_access(integer, integer, integer) from public, anon, service_role;
grant execute on function public.expired_pastoral_counts() to authenticated;
grant execute on function public.purge_expired_pastoral_data() to authenticated;
grant execute on function public.record_pastoral_access(integer, integer, integer) to authenticated;
