-- P2-502 smoke test: the public gallery filters by category, but only albums had one
-- and photos are not placed in albums yet, so every category filter came back empty.
alter table public.media_assets
  add column category public.media_category not null default 'umum';

create index media_assets_category_idx on public.media_assets (category);
