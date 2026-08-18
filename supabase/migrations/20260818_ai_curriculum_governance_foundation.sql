create table if not exists public.curriculum_source_registry (
  id uuid primary key default gen_random_uuid(), jurisdiction text not null default 'national', topic text not null,
  source_name text not null, source_url text not null unique,
  source_class text not null check (source_class in ('regulator','statute','administrative_code','exam_vendor','carrier','government','industry_reference')),
  authority_rank integer not null default 50 check (authority_rank between 1 and 100), active boolean not null default true,
  last_checked_at timestamptz, last_changed_at timestamptz, content_fingerprint text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.curriculum_monitor_runs (
  id uuid primary key default gen_random_uuid(), run_type text not null default 'scheduled' check (run_type in ('scheduled','manual','backfill')),
  status text not null default 'queued' check (status in ('queued','running','completed','partial','failed')), started_at timestamptz, completed_at timestamptz,
  sources_checked integer not null default 0, changes_detected integer not null default 0, content_items_impacted integer not null default 0,
  summary jsonb not null default '{}'::jsonb, error_text text, created_at timestamptz not null default now()
);
create table if not exists public.curriculum_change_events (
  id uuid primary key default gen_random_uuid(), monitor_run_id uuid references public.curriculum_monitor_runs(id) on delete set null,
  source_id uuid references public.curriculum_source_registry(id) on delete set null, jurisdiction text not null default 'national', topic text not null,
  change_type text not null check (change_type in ('new','modified','withdrawn','effective_date','exam_outline','carrier_rule','other')),
  effective_at timestamptz, detected_at timestamptz not null default now(), confidence numeric not null default 0 check (confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb, status text not null default 'detected' check (status in ('detected','analyzed','applied','needs_review','dismissed'))
);
create table if not exists public.curriculum_content_versions (
  id uuid primary key default gen_random_uuid(), content_type text not null check (content_type in ('course','module','question','study_guide','exam_blueprint')),
  content_id uuid, jurisdiction text not null default 'national', version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','verified','published','superseded','quarantined')),
  source_snapshot jsonb not null default '[]'::jsonb, validation_score numeric not null default 0 check (validation_score between 0 and 1),
  validated_at timestamptz, published_at timestamptz, superseded_at timestamptz,
  change_event_id uuid references public.curriculum_change_events(id) on delete set null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.curriculum_validation_findings (
  id uuid primary key default gen_random_uuid(), monitor_run_id uuid references public.curriculum_monitor_runs(id) on delete cascade,
  content_type text not null, content_id uuid, severity text not null check (severity in ('info','warning','critical')), finding_type text not null,
  finding text not null, recommended_action text, confidence numeric not null default 0 check (confidence between 0 and 1), resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.curriculum_source_registry enable row level security;
alter table public.curriculum_monitor_runs enable row level security;
alter table public.curriculum_change_events enable row level security;
alter table public.curriculum_content_versions enable row level security;
alter table public.curriculum_validation_findings enable row level security;
create policy curriculum_sources_admin_read on public.curriculum_source_registry for select to authenticated using (public.is_owner_or_admin());
create policy curriculum_runs_admin_read on public.curriculum_monitor_runs for select to authenticated using (public.is_owner_or_admin());
create policy curriculum_changes_admin_read on public.curriculum_change_events for select to authenticated using (public.is_owner_or_admin());
create policy curriculum_versions_admin_read on public.curriculum_content_versions for select to authenticated using (public.is_owner_or_admin());
create policy curriculum_findings_admin_read on public.curriculum_validation_findings for select to authenticated using (public.is_owner_or_admin());
revoke all on public.curriculum_source_registry, public.curriculum_monitor_runs, public.curriculum_change_events, public.curriculum_content_versions, public.curriculum_validation_findings from anon;
grant select on public.curriculum_source_registry, public.curriculum_monitor_runs, public.curriculum_change_events, public.curriculum_content_versions, public.curriculum_validation_findings to authenticated;
create index if not exists curriculum_sources_topic_idx on public.curriculum_source_registry(jurisdiction,topic,active);
create index if not exists curriculum_changes_status_idx on public.curriculum_change_events(status,detected_at desc);
create index if not exists curriculum_versions_lookup_idx on public.curriculum_content_versions(content_type,content_id,status);
create index if not exists curriculum_findings_open_idx on public.curriculum_validation_findings(severity,created_at desc) where resolved_at is null;