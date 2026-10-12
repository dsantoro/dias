create table if not exists public.users (
  id uuid primary key,
  name text not null check (char_length(name) between 2 and 60),
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at bigint not null
);

create index if not exists sessions_expiry on public.sessions(expires_at);

create table if not exists public.events (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  emoji text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists events_user_date on public.events(user_id, date, created_at);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.events enable row level security;