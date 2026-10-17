-- Add object_position column to site_section_media for custom focal point / fit
alter table public.site_section_media
add column if not exists object_position text default 'center';
