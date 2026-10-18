-- Audit album mutations in the database; authenticated staff cannot insert audit_logs.
create or replace function private.record_media_album_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.media_albums;
  v_action text;
begin
  v_row := coalesce(new, old);
  if tg_op = 'INSERT' then
    v_action := 'media.album_created';
  elsif tg_op = 'DELETE' then
    v_action := 'media.album_deleted';
  elsif old.public_download_enabled is distinct from new.public_download_enabled then
    v_action := 'media.album_download_changed';
  else
    v_action := 'media.album_updated';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (
    auth.uid(),
    v_action,
    'media_albums',
    v_row.id,
    jsonb_build_object(
      'slug', v_row.slug,
      'status', v_row.status,
      'public_download_enabled', v_row.public_download_enabled,
      'old_public_download_enabled', case when tg_op = 'UPDATE' then old.public_download_enabled end
    )
  );
  return v_row;
end;
$$;

revoke all on function private.record_media_album_audit() from public, anon, authenticated;

create trigger media_albums_audit_mutation
after insert or update or delete on public.media_albums
for each row execute function private.record_media_album_audit();
