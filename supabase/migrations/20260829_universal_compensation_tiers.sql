-- B040: Universal product/program compensation architecture.
-- Additive, versioned, and backwards-compatible with the existing ACA compensation engine.

alter table public.campaigns
  add column if not exists program_type text not null default 'program',
  add column if not exists production_source text not null default 'comp_production_events',
  add column if not exists primary_metric_key text not null default 'units',
  add column if not exists unit_label text not null default 'unit',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='campaigns_program_type_check') then
    alter table public.campaigns add constraint campaigns_program_type_check
      check (program_type in ('product','program','campaign','service','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname='campaigns_production_source_check') then
    alter table public.campaigns add constraint campaigns_production_source_check
      check (production_source in ('campaign_enrollments','comp_production_events'));
  end if;
end $$;

update public.campaigns
set program_type='program',
    production_source='campaign_enrollments',
    primary_metric_key='qualified_enrollments',
    unit_label='qualified enrollment',
    metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('compensation_adapter','aca_qualified_enrollment')
where code='ACA_DIALER';

alter table public.comp_plan_versions
  add column if not exists base_rate numeric(12,4) not null default 0,
  add column if not exists rate_basis text not null default 'per_unit',
  add column if not exists metric_key text not null default 'units',
  add column if not exists unit_label text not null default 'unit';

do $$ begin
  if not exists (select 1 from pg_constraint where conname='comp_plan_versions_rate_basis_check') then
    alter table public.comp_plan_versions add constraint comp_plan_versions_rate_basis_check
      check (rate_basis in ('per_unit','percent_of_value','flat'));
  end if;
  if not exists (select 1 from pg_constraint where conname='comp_plan_versions_base_rate_check') then
    alter table public.comp_plan_versions add constraint comp_plan_versions_base_rate_check
      check (base_rate >= 0);
  end if;
end $$;

update public.comp_plan_versions p
set base_rate=case when p.base_rate=0 and p.base_enrollment_amount is not null then p.base_enrollment_amount else p.base_rate end,
    metric_key=c.primary_metric_key,
    unit_label=c.unit_label
from public.campaigns c
where c.id=p.campaign_id;

alter table public.comp_bonus_rules
  add column if not exists rule_name text,
  add column if not exists applies_to_role text not null default 'agent',
  add column if not exists metric_key text not null default 'units',
  add column if not exists period text not null default 'monthly',
  add column if not exists aggregation_scope text not null default 'self',
  add column if not exists payout_type text not null default 'flat_bonus',
  add column if not exists active boolean not null default true;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='comp_bonus_rules_period_check') then
    alter table public.comp_bonus_rules add constraint comp_bonus_rules_period_check
      check (period in ('weekly','monthly','quarterly','annual','one_time'));
  end if;
  if not exists (select 1 from pg_constraint where conname='comp_bonus_rules_payout_type_check') then
    alter table public.comp_bonus_rules add constraint comp_bonus_rules_payout_type_check
      check (payout_type in ('flat_bonus','per_unit_bonus','percent_of_value'));
  end if;
end $$;

update public.comp_bonus_rules r
set rule_name=coalesce(r.rule_name,
      case r.rule_type
        when 'agent_monthly' then 'Agent Monthly Performance Bonus'
        when 'manager_direct_coaching' then 'Direct Manager Coaching Bonus'
        when 'market_monthly' then 'Direct Market Volume Bonus'
        when 'promoting_manager_market' then 'Promoted Market Override Bonus'
        else initcap(replace(r.rule_type,'_',' '))
      end),
    applies_to_role=case when r.rule_type='agent_monthly' then 'agent' else 'manager' end,
    metric_key=case when exists (
      select 1 from public.comp_plan_versions p join public.campaigns c on c.id=p.campaign_id
      where p.id=r.plan_version_id and c.code='ACA_DIALER'
    ) then 'qualified_enrollments' else r.metric_key end,
    period='monthly',
    aggregation_scope=case r.rule_type
      when 'agent_monthly' then 'self'
      when 'manager_direct_coaching' then 'per_direct_member'
      when 'market_monthly' then 'self_plus_first_generation'
      when 'promoting_manager_market' then 'promoted_market'
      else r.aggregation_scope
    end,
    payout_type='flat_bonus';

create table if not exists public.comp_tier_rules (
  id uuid primary key default gen_random_uuid(),
  plan_version_id uuid not null references public.comp_plan_versions(id) on delete cascade,
  tier_order integer not null,
  tier_code text not null,
  tier_name text not null,
  applies_to_role text not null default 'agent',
  metric_key text not null default 'units',
  min_units numeric(14,4) not null default 0 check (min_units >= 0),
  max_units numeric(14,4),
  benefit_type text not null check (benefit_type in ('rate_override','flat_bonus','bonus_reference')),
  benefit_value numeric(14,4),
  bonus_rule_type text,
  bonus_threshold numeric(14,4),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(plan_version_id,tier_code),
  check (max_units is null or max_units > min_units),
  check (
    (benefit_type in ('rate_override','flat_bonus') and benefit_value is not null and benefit_value >= 0)
    or
    (benefit_type='bonus_reference' and bonus_rule_type is not null and bonus_threshold is not null)
  )
);
create index if not exists comp_tier_rules_lookup_idx
  on public.comp_tier_rules(plan_version_id,applies_to_role,metric_key,tier_order);

alter table public.comp_tier_rules enable row level security;
drop policy if exists comp_tier_rules_read on public.comp_tier_rules;
create policy comp_tier_rules_read on public.comp_tier_rules
  for select to authenticated
  using (exists (
    select 1 from public.comp_plan_versions p
    where p.id=comp_tier_rules.plan_version_id
      and (p.status='published' or private.has_comp_permission('comp.view_all'))
  ));
revoke all on public.comp_tier_rules from anon;
grant select on public.comp_tier_rules to authenticated;
grant all on public.comp_tier_rules to service_role;

create table if not exists public.comp_production_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  metric_key text not null default 'units',
  units numeric(14,4) not null default 1 check (units >= 0),
  value_amount numeric(14,2) not null default 0 check (value_amount >= 0),
  status text not null default 'qualified' check (status in ('pending','qualified','void','reversed')),
  source_type text not null default 'manual_admin',
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists comp_production_events_source_ref_uq
  on public.comp_production_events(campaign_id,source_ref) where source_ref is not null;
create index if not exists comp_production_events_calc_idx
  on public.comp_production_events(campaign_id,user_id,metric_key,occurred_at,status);

alter table public.comp_production_events enable row level security;
drop policy if exists comp_production_events_self_read on public.comp_production_events;
create policy comp_production_events_self_read on public.comp_production_events
  for select to authenticated
  using (user_id=auth.uid() or private.is_owner_or_admin());
drop policy if exists comp_production_events_admin_write on public.comp_production_events;
create policy comp_production_events_admin_write on public.comp_production_events
  for all to authenticated
  using (private.is_owner_or_admin())
  with check (private.is_owner_or_admin());
revoke all on public.comp_production_events from anon;
grant select,insert,update,delete on public.comp_production_events to authenticated;
grant all on public.comp_production_events to service_role;

-- Correct the already-approved ACA manager coaching threshold while the plan is still a draft.
with targets as (
  select r.id,r.plan_version_id,r.threshold as old_threshold,r.amount
  from public.comp_bonus_rules r
  join public.comp_plan_versions p on p.id=r.plan_version_id
  join public.campaigns c on c.id=p.campaign_id
  where c.code='ACA_DIALER'
    and p.status='draft'
    and r.rule_type='manager_direct_coaching'
    and r.threshold=50
    and r.amount=50
), changed as (
  update public.comp_bonus_rules r
  set threshold=200
  from targets t
  where r.id=t.id
  returning r.id,r.plan_version_id,r.threshold,r.amount
)
insert into public.comp_plan_change_log(plan_version_id,actor_id,action,before_state,after_state)
select t.plan_version_id,null,'approved_rule_threshold_corrected',
       jsonb_build_object('rule_id',t.id,'rule_type','manager_direct_coaching','threshold',t.old_threshold,'amount',t.amount),
       jsonb_build_object('rule_id',c.id,'rule_type','manager_direct_coaching','threshold',c.threshold,'amount',c.amount)
from targets t join changed c on c.id=t.id;

-- Formalize the current approved ACA agent earning path as tiers without creating any new dollar promise.
insert into public.comp_tier_rules(
  plan_version_id,tier_order,tier_code,tier_name,applies_to_role,metric_key,min_units,max_units,
  benefit_type,benefit_value,bonus_rule_type,bonus_threshold,metadata
)
select p.id,1,'standard','Standard','agent','qualified_enrollments',0,250,
       'rate_override',15,null,null,
       jsonb_build_object('source','approved_aca_base_compensation','display_note','$15 per qualified enrollment')
from public.comp_plan_versions p join public.campaigns c on c.id=p.campaign_id
where c.code='ACA_DIALER' and p.status='draft'
on conflict (plan_version_id,tier_code) do update set
  tier_order=excluded.tier_order,tier_name=excluded.tier_name,metric_key=excluded.metric_key,
  min_units=excluded.min_units,max_units=excluded.max_units,benefit_type=excluded.benefit_type,
  benefit_value=excluded.benefit_value,bonus_rule_type=excluded.bonus_rule_type,
  bonus_threshold=excluded.bonus_threshold,metadata=excluded.metadata,active=true;

insert into public.comp_tier_rules(
  plan_version_id,tier_order,tier_code,tier_name,applies_to_role,metric_key,min_units,max_units,
  benefit_type,benefit_value,bonus_rule_type,bonus_threshold,metadata
)
select p.id,2,'performance_250','Performance 250','agent','qualified_enrollments',250,300,
       'bonus_reference',null,'agent_monthly',250,
       jsonb_build_object('source','approved_aca_bonus','display_note','$250 monthly bonus at 250+ qualified enrollments')
from public.comp_plan_versions p join public.campaigns c on c.id=p.campaign_id
where c.code='ACA_DIALER' and p.status='draft'
on conflict (plan_version_id,tier_code) do update set
  tier_order=excluded.tier_order,tier_name=excluded.tier_name,metric_key=excluded.metric_key,
  min_units=excluded.min_units,max_units=excluded.max_units,benefit_type=excluded.benefit_type,
  benefit_value=excluded.benefit_value,bonus_rule_type=excluded.bonus_rule_type,
  bonus_threshold=excluded.bonus_threshold,metadata=excluded.metadata,active=true;

insert into public.comp_tier_rules(
  plan_version_id,tier_order,tier_code,tier_name,applies_to_role,metric_key,min_units,max_units,
  benefit_type,benefit_value,bonus_rule_type,bonus_threshold,metadata
)
select p.id,3,'performance_300','Performance 300','agent','qualified_enrollments',300,null,
       'bonus_reference',null,'agent_monthly',300,
       jsonb_build_object('source','approved_aca_bonus','display_note','$500 monthly bonus at 300+ qualified enrollments')
from public.comp_plan_versions p join public.campaigns c on c.id=p.campaign_id
where c.code='ACA_DIALER' and p.status='draft'
on conflict (plan_version_id,tier_code) do update set
  tier_order=excluded.tier_order,tier_name=excluded.tier_name,metric_key=excluded.metric_key,
  min_units=excluded.min_units,max_units=excluded.max_units,benefit_type=excluded.benefit_type,
  benefit_value=excluded.benefit_value,bonus_rule_type=excluded.bonus_rule_type,
  bonus_threshold=excluded.bonus_threshold,metadata=excluded.metadata,active=true;
