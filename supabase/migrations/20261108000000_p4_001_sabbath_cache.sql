-- The cache has no application grants or policies until content rights are established.
create table private.sabbath_content_cache (
  source_id text primary key check (length(btrim(source_id)) > 0),
  source_version text not null check (length(btrim(source_version)) > 0),
  fetched_at timestamptz not null,
  etag text,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  validation_status text not null default 'valid' check (validation_status = 'valid')
);

alter table private.sabbath_content_cache enable row level security;
revoke all on private.sabbath_content_cache from public, anon, authenticated, service_role;
