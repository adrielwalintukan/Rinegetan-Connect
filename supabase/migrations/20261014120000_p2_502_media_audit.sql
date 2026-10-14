-- P2-502 smoke test: media mutations were never audited because authenticated
-- staff cannot insert into audit_logs directly. Audit them in the database,
-- the same way content (P2-301) and section media (P2-405) are audited.

create or replace function private.record_media_asset_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_row public.media_assets;
begin
  v_row := coalesce(new, old);

  if tg_op = 'INSERT' then
    v_action := 'media.uploaded';
  elsif tg_op = 'DELETE' then
    v_action := 'media.deleted';
  elsif new.hidden_at is not null and old.hidden_at is null then
    v_action := 'media.hidden';
  elsif new.status is distinct from old.status then
    v_action := 'media.status_changed';
  elsif new.consent_status is distinct from old.consent_status then
    v_action := 'media.consent_changed';
  else
    v_action := 'media.updated';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (
    auth.uid(),
    v_action,
    'media_assets',
    v_row.id,
    jsonb_build_object(
      'storage_path', v_row.storage_path,
      'status', v_row.status,
      'old_status', case when tg_op = 'UPDATE' then old.status end,
      'consent_status', v_row.consent_status,
      'old_consent_status', case when tg_op = 'UPDATE' then old.consent_status end,
      'subject_age_group', v_row.subject_age_group,
      'hidden_reason', v_row.hidden_reason
    )
  );

  return v_row;
end;
$$;

create trigger media_assets_audit_mutation
after insert or update or delete on public.media_assets
for each row execute function private.record_media_asset_audit();
