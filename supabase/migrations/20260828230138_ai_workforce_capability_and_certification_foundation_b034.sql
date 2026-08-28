alter table public.ai_jobs add column if not exists parent_job_id uuid references public.ai_jobs(id) on delete set null;
alter table public.ai_jobs add column if not exists assigned_by_ai_employee_id uuid references public.ai_employees(id) on delete set null;
alter table public.ai_jobs add column if not exists priority text not null default 'normal';
alter table public.ai_jobs add column if not exists source text not null default 'human';
alter table public.ai_jobs add column if not exists due_at timestamptz;
alter table public.ai_jobs add column if not exists started_at timestamptz;
alter table public.ai_jobs add column if not exists resolution_notes text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='ai_jobs_priority_check') then
    alter table public.ai_jobs add constraint ai_jobs_priority_check check (priority in ('low','normal','high','critical'));
  end if;
end $$;

create index if not exists ai_jobs_parent_job_id_idx on public.ai_jobs(parent_job_id);
create index if not exists ai_jobs_assigned_by_ai_employee_id_idx on public.ai_jobs(assigned_by_ai_employee_id);
create index if not exists ai_jobs_status_priority_idx on public.ai_jobs(status,priority,created_at desc);

create table if not exists public.ai_employee_capabilities (
  id uuid primary key default gen_random_uuid(),
  ai_employee_id uuid not null references public.ai_employees(id) on delete cascade,
  capability_key text not null,
  capability_label text not null,
  capability_description text not null,
  execution_mode text not null default 'analyze',
  requires_human_approval boolean not null default false,
  status text not null default 'enabled',
  endpoint text,
  version text not null default '1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(ai_employee_id,capability_key)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='ai_employee_capabilities_mode_check') then
    alter table public.ai_employee_capabilities add constraint ai_employee_capabilities_mode_check check (execution_mode in ('read','analyze','generate','delegate','track','write_internal','write_protected'));
  end if;
  if not exists (select 1 from pg_constraint where conname='ai_employee_capabilities_status_check') then
    alter table public.ai_employee_capabilities add constraint ai_employee_capabilities_status_check check (status in ('enabled','disabled','planned'));
  end if;
end $$;

create table if not exists public.ai_employee_certifications (
  id uuid primary key default gen_random_uuid(),
  ai_employee_id uuid not null references public.ai_employees(id) on delete cascade,
  capability_key text not null,
  status text not null,
  evidence jsonb not null default '{}'::jsonb,
  build_number text not null,
  certified_at timestamptz not null default now(),
  unique(ai_employee_id,capability_key,build_number)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='ai_employee_certifications_status_check') then
    alter table public.ai_employee_certifications add constraint ai_employee_certifications_status_check check (status in ('pass','fail','pending'));
  end if;
end $$;

create index if not exists ai_employee_capabilities_employee_idx on public.ai_employee_capabilities(ai_employee_id,status);
create index if not exists ai_employee_certifications_employee_idx on public.ai_employee_certifications(ai_employee_id,certified_at desc);

alter table public.ai_employee_capabilities enable row level security;
alter table public.ai_employee_certifications enable row level security;

drop policy if exists ai_employee_capabilities_owner_admin_all on public.ai_employee_capabilities;
create policy ai_employee_capabilities_owner_admin_all on public.ai_employee_capabilities for all to authenticated using ((select private.is_owner_or_admin())) with check ((select private.is_owner_or_admin()));

drop policy if exists ai_employee_certifications_owner_admin_all on public.ai_employee_certifications;
create policy ai_employee_certifications_owner_admin_all on public.ai_employee_certifications for all to authenticated using ((select private.is_owner_or_admin())) with check ((select private.is_owner_or_admin()));

grant select,insert,update,delete on public.ai_employee_capabilities to authenticated;
grant select,insert,update,delete on public.ai_employee_certifications to authenticated;
