create table if not exists public.contract_plan_versions (
  id uuid primary key default gen_random_uuid(), campaign_id uuid references public.campaigns(id) on delete cascade,
  comp_plan_version_id uuid references public.comp_plan_versions(id) on delete restrict, version integer not null,
  status text not null default 'draft' check (status in ('draft','published','superseded','retired')),
  title text not null, body_markdown text not null, effective_from date not null, effective_to date,
  created_by uuid references public.profiles(id) on delete set null, published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz, created_at timestamptz not null default now(), unique(campaign_id,version)
);
create table if not exists public.user_contract_acceptances (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  contract_version_id uuid not null references public.contract_plan_versions(id) on delete restrict,
  accepted_at timestamptz not null default now(), typed_name text, ip_hash text, metadata jsonb not null default '{}'::jsonb,
  unique(user_id,contract_version_id)
);
create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(), campaign_id uuid references public.campaigns(id) on delete set null,
  period_start date not null, period_end date not null, payable_on date not null,
  status text not null default 'draft' check (status in ('draft','calculated','approved','paid','void')),
  gross_amount numeric(14,2) not null default 0, approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz, paid_at timestamptz, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), unique(campaign_id,period_start,period_end)
);
create table if not exists public.payroll_run_items (
  id uuid primary key default gen_random_uuid(), payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict, comp_ledger_id uuid references public.comp_ledger(id) on delete set null,
  earning_type text not null, description text, amount numeric(14,2) not null, created_at timestamptz not null default now()
);
create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(), name text not null,
  account_type text not null check (account_type in ('bank','revenue','expense','asset','liability','equity')),
  external_provider text, external_account_id text, active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(), account_id uuid references public.finance_accounts(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null, transaction_date date not null,
  direction text not null check (direction in ('inflow','outflow')), category text not null,
  amount numeric(14,2) not null check (amount >= 0), description text, source text not null default 'manual',
  source_ref text, reconciled boolean not null default false, metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.shared_mailboxes (
  id uuid primary key default gen_random_uuid(), mailbox_key text not null unique, display_name text not null,
  email_address text not null unique, provider text not null default 'ionos', active boolean not null default true,
  config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.shared_mailbox_members (
  id uuid primary key default gen_random_uuid(), mailbox_id uuid not null references public.shared_mailboxes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, can_read boolean not null default true,
  can_send boolean not null default true, can_manage boolean not null default false,
  granted_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), unique(mailbox_id,user_id)
);
create table if not exists public.email_threads (
  id uuid primary key default gen_random_uuid(), mailbox_id uuid not null references public.shared_mailboxes(id) on delete cascade,
  external_thread_id text, subject text, contact_email text, assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open','pending','closed','spam')),
  last_message_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.email_threads(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','internal')), from_address text,
  to_addresses text[] not null default '{}', cc_addresses text[] not null default '{}', body_text text, body_html text,
  external_message_id text, sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.leadership_relationships (
  id uuid primary key default gen_random_uuid(), campaign_id uuid references public.campaigns(id) on delete cascade,
  leader_id uuid not null references public.profiles(id) on delete cascade, member_id uuid not null references public.profiles(id) on delete cascade,
  generation integer not null default 1 check (generation >= 1), active boolean not null default true,
  started_at date not null default current_date, ended_at date, unique(campaign_id,leader_id,member_id,started_at)
);
create table if not exists public.promotion_qualification_snapshots (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, qualification_month date not null,
  personal_enrollments integer not null default 0, first_generation_enrollments integer not null default 0,
  active_direct_agents integer not null default 0, compliance_passed boolean not null default false,
  sop_passed boolean not null default false, qualifies boolean not null default false,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(campaign_id,user_id,qualification_month)
);
create table if not exists public.ai_employees (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, role_description text not null,
  status text not null default 'active' check (status in ('active','paused','retired')),
  autonomy_level text not null default 'managed' check (autonomy_level in ('observe','managed','autonomous')),
  config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ai_employee_runs (
  id uuid primary key default gen_random_uuid(), ai_employee_id uuid not null references public.ai_employees(id) on delete cascade,
  run_type text not null, status text not null default 'queued' check (status in ('queued','running','completed','failed','quarantined')),
  started_at timestamptz, completed_at timestamptz, summary jsonb not null default '{}'::jsonb, error_text text,
  created_at timestamptz not null default now()
);

alter table public.contract_plan_versions enable row level security;
alter table public.user_contract_acceptances enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_run_items enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.shared_mailboxes enable row level security;
alter table public.shared_mailbox_members enable row level security;
alter table public.email_threads enable row level security;
alter table public.email_messages enable row level security;
alter table public.leadership_relationships enable row level security;
alter table public.promotion_qualification_snapshots enable row level security;
alter table public.ai_employees enable row level security;
alter table public.ai_employee_runs enable row level security;

create policy contract_versions_admin_read on public.contract_plan_versions for select to authenticated using (public.is_owner_or_admin());
create policy contract_versions_admin_write on public.contract_plan_versions for all to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());
create policy user_contract_self_read on public.user_contract_acceptances for select to authenticated using (user_id=auth.uid() or public.is_owner_or_admin());
create policy user_contract_self_insert on public.user_contract_acceptances for insert to authenticated with check (user_id=auth.uid());
create policy payroll_admin_all on public.payroll_runs for all to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());
create policy payroll_items_admin_all on public.payroll_run_items for all to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());
create policy payroll_items_self_read on public.payroll_run_items for select to authenticated using (user_id=auth.uid() or public.is_owner_or_admin());
create policy finance_owner_only_accounts on public.finance_accounts for all to authenticated using (public.current_app_role()='owner') with check (public.current_app_role()='owner');
create policy finance_owner_only_txns on public.finance_transactions for all to authenticated using (public.current_app_role()='owner') with check (public.current_app_role()='owner');
create policy shared_mailboxes_member_read on public.shared_mailboxes for select to authenticated using (public.current_app_role()='owner' or exists(select 1 from public.shared_mailbox_members m where m.mailbox_id=id and m.user_id=auth.uid() and m.can_read));
create policy shared_mailbox_members_owner_manage on public.shared_mailbox_members for all to authenticated using (public.current_app_role()='owner') with check (public.current_app_role()='owner');
create policy shared_mailbox_members_self_read on public.shared_mailbox_members for select to authenticated using (user_id=auth.uid() or public.current_app_role()='owner');
create policy email_threads_member_access on public.email_threads for all to authenticated using (public.current_app_role()='owner' or exists(select 1 from public.shared_mailbox_members m where m.mailbox_id=email_threads.mailbox_id and m.user_id=auth.uid() and m.can_read)) with check (public.current_app_role()='owner' or exists(select 1 from public.shared_mailbox_members m where m.mailbox_id=email_threads.mailbox_id and m.user_id=auth.uid() and m.can_send));
create policy email_messages_member_access on public.email_messages for all to authenticated using (exists(select 1 from public.email_threads t join public.shared_mailbox_members m on m.mailbox_id=t.mailbox_id where t.id=email_messages.thread_id and m.user_id=auth.uid() and m.can_read) or public.current_app_role()='owner') with check (exists(select 1 from public.email_threads t join public.shared_mailbox_members m on m.mailbox_id=t.mailbox_id where t.id=email_messages.thread_id and m.user_id=auth.uid() and m.can_send) or public.current_app_role()='owner');
create policy leadership_admin_readwrite on public.leadership_relationships for all to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());
create policy leadership_self_read on public.leadership_relationships for select to authenticated using (leader_id=auth.uid() or member_id=auth.uid() or public.is_owner_or_admin());
create policy promo_admin_all on public.promotion_qualification_snapshots for all to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());
create policy promo_self_read on public.promotion_qualification_snapshots for select to authenticated using (user_id=auth.uid() or public.is_owner_or_admin());
create policy ai_owner_admin_read on public.ai_employees for select to authenticated using (public.is_owner_or_admin());
create policy ai_owner_admin_write on public.ai_employees for all to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());
create policy ai_runs_owner_admin on public.ai_employee_runs for all to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());

insert into public.ai_employees(code,name,role_description,autonomy_level,config)
values ('licensing_curriculum_manager','AI Licensing & Curriculum Manager','Continuously research licensing requirements, validate authoritative sources, identify regulatory and exam-outline changes, assess curriculum impact, maintain study guides and question banks, and quarantine uncertain material instead of publishing unsupported facts.','autonomous',jsonb_build_object('priority','critical','continuous_monitoring',true,'quarantine_below_confidence',0.85))
on conflict(code) do update set role_description=excluded.role_description,autonomy_level=excluded.autonomy_level,config=excluded.config,updated_at=now();