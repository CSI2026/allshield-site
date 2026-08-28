alter table public.ai_employees add column if not exists job_title text;
alter table public.ai_employees add column if not exists department text;
alter table public.ai_employees add column if not exists manager_employee_id uuid references public.ai_employees(id) on delete set null;
alter table public.ai_employees add column if not exists job_assignment text;
alter table public.ai_employees add column if not exists kpis jsonb not null default '[]'::jsonb;
alter table public.ai_employees add column if not exists learning_enabled boolean not null default true;

create table if not exists public.ai_employee_feedback (
  id uuid primary key default gen_random_uuid(),
  ai_employee_id uuid not null references public.ai_employees(id) on delete cascade,
  ai_job_id uuid references public.ai_jobs(id) on delete set null,
  ai_employee_run_id uuid references public.ai_employee_runs(id) on delete set null,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  outcome text not null check (outcome in ('accepted','revised','rejected')),
  feedback_text text not null,
  teach_employee boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_employee_learning (
  id uuid primary key default gen_random_uuid(),
  ai_employee_id uuid not null references public.ai_employees(id) on delete cascade,
  source_feedback_id uuid references public.ai_employee_feedback(id) on delete set null,
  lesson_text text not null,
  status text not null default 'candidate' check (status in ('candidate','active','retired')),
  confidence numeric(4,3) not null default 1.000 check (confidence >= 0 and confidence <= 1),
  evidence_count integer not null default 1 check (evidence_count >= 1),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  last_used_at timestamptz,
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_employee_learning_source_feedback_uidx on public.ai_employee_learning(source_feedback_id) where source_feedback_id is not null;
create index if not exists ai_employee_feedback_employee_created_idx on public.ai_employee_feedback(ai_employee_id, created_at desc);
create index if not exists ai_employee_learning_employee_status_idx on public.ai_employee_learning(ai_employee_id, status, updated_at desc);
create index if not exists ai_employee_runs_employee_created_idx on public.ai_employee_runs(ai_employee_id, created_at desc);
create index if not exists ai_jobs_agent_type_created_idx on public.ai_jobs(agent_type, created_at desc);

alter table public.ai_employee_feedback enable row level security;
alter table public.ai_employee_learning enable row level security;

drop policy if exists ai_feedback_owner_admin_all on public.ai_employee_feedback;
create policy ai_feedback_owner_admin_all on public.ai_employee_feedback
  for all to authenticated
  using ((select private.is_owner_or_admin()))
  with check ((select private.is_owner_or_admin()));

drop policy if exists ai_learning_owner_admin_all on public.ai_employee_learning;
create policy ai_learning_owner_admin_all on public.ai_employee_learning
  for all to authenticated
  using ((select private.is_owner_or_admin()))
  with check ((select private.is_owner_or_admin()));
