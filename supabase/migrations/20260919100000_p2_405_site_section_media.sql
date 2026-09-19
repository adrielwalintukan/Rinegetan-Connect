-- P2-405 Site Section Media CMS Table, RLS, and Audit Trigger

create table public.site_section_media (
  section_key text primary key
    check (section_key in ('home_hero', 'home_welcome', 'sekolah_sabat', 'tentang_kami')),
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  custom_alt_text text check (custom_alt_text is null or char_length(btrim(custom_alt_text)) between 1 and 300),
  custom_caption text check (custom_caption is null or char_length(btrim(custom_caption)) between 1 and 300),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create trigger site_section_media_set_updated_at
before update on public.site_section_media
for each row execute function private.set_updated_at();

-- RLS & Grants
alter table public.site_section_media enable row level security;

revoke all on table public.site_section_media from public, anon, authenticated;

grant select on table public.site_section_media to anon, authenticated;
grant insert, update, delete on table public.site_section_media to authenticated;

-- Policies
create policy site_section_media_public_read
on public.site_section_media for select
to anon, authenticated
using (true);

create policy site_section_media_staff_write
on public.site_section_media for all
to authenticated
using (private.is_editor_or_admin())
with check (private.is_editor_or_admin());

-- Audit Trigger Function
create or replace function private.record_section_media_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_changes jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'site_settings.create_section_media';
    v_changes := jsonb_build_object(
      'section_key', new.section_key,
      'asset_id', new.asset_id,
      'custom_alt_text', new.custom_alt_text,
      'custom_caption', new.custom_caption
    );
  elsif tg_op = 'UPDATE' then
    v_action := 'site_settings.update_section_media';
    v_changes := jsonb_build_object(
      'section_key', new.section_key,
      'asset_id', new.asset_id,
      'old_asset_id', old.asset_id,
      'custom_alt_text', new.custom_alt_text,
      'custom_caption', new.custom_caption
    );
  elsif tg_op = 'DELETE' then
    v_action := 'site_settings.delete_section_media';
    v_changes := jsonb_build_object(
      'section_key', old.section_key,
      'asset_id', old.asset_id
    );
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  ) values (
    auth.uid(),
    v_action,
    'site_section_media',
    coalesce(new.asset_id, old.asset_id),
    v_changes
  );

  return coalesce(new, old);
end;
$$;

create trigger site_section_media_audit_mutation
after insert or update or delete on public.site_section_media
for each row execute function private.record_section_media_audit();
