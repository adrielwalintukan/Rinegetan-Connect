create type public.staff_role as enum ('admin', 'editor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 1 and 120)
    check (display_name = btrim(display_name)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  request_id uuid,
  changes jsonb not null default '{}'::jsonb check (jsonb_typeof(changes) = 'object'),
  occurred_at timestamptz not null default now()
);

create index audit_logs_actor_occurred_at_idx
  on public.audit_logs (actor_id, occurred_at desc);

create index audit_logs_entity_occurred_at_idx
  on public.audit_logs (entity_type, entity_id, occurred_at desc);
