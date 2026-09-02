create table if not exists public.academy_liveavatar_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid references public.academy_lessons(id) on delete set null,
  provider_session_id uuid unique,
  mode text not null default 'LITE',
  status text not null default 'created',
  started_at timestamptz not null default now(),
  last_keepalive_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_academy_liveavatar_sessions_user_status
  on public.academy_liveavatar_sessions(user_id,status);
create index if not exists idx_academy_liveavatar_sessions_lesson
  on public.academy_liveavatar_sessions(lesson_id,started_at desc);

alter table public.academy_liveavatar_sessions enable row level security;

comment on table public.academy_liveavatar_sessions is
  'Service-managed learner LiveAvatar LITE session audit. Direct client table access is denied by RLS; the authenticated Academy gateway mediates session lifecycle.';
