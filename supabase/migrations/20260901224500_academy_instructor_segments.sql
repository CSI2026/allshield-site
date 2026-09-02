create table if not exists public.academy_instructor_segments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  segment_order integer not null,
  segment_title text not null,
  section_ref text,
  script_text text,
  provider text,
  provider_job_id text,
  source_audio_url text,
  media_url text,
  duration_seconds numeric,
  status text not null default 'planned',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, segment_order)
);

create index if not exists idx_academy_instructor_segments_lesson_order
  on public.academy_instructor_segments(lesson_id, segment_order);
create index if not exists idx_academy_instructor_segments_status
  on public.academy_instructor_segments(status);

alter table public.academy_instructor_segments enable row level security;

comment on table public.academy_instructor_segments is
  'Ordered canonical Ava teaching segments. Learners receive media through authenticated Academy APIs; direct table access remains blocked by RLS.';
