-- B041: Living compensation contracts.
-- Current agreements are generated from compensation configuration; signed historical versions remain immutable.

alter table public.comp_plan_versions
  add column if not exists residuals_enabled boolean not null default true;

alter table public.contract_plan_versions
  add column if not exists body_hash text,
  add column if not exists generated_at timestamptz,
  add column if not exists source_state jsonb not null default '{}'::jsonb;

create table if not exists public.user_contract_requirements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  contract_version_id uuid not null references public.contract_plan_versions(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','waived')),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,contract_version_id)
);
create index if not exists user_contract_requirements_user_idx
  on public.user_contract_requirements(user_id,status,created_at desc);
create index if not exists user_contract_requirements_campaign_idx
  on public.user_contract_requirements(campaign_id,contract_version_id,status);

alter table public.user_contract_requirements enable row level security;
drop policy if exists user_contract_requirements_read on public.user_contract_requirements;
create policy user_contract_requirements_read on public.user_contract_requirements
  for select to authenticated
  using ((select auth.uid())=user_id or private.is_owner_or_admin());
revoke all on public.user_contract_requirements from anon;
grant select on public.user_contract_requirements to authenticated;
grant all on public.user_contract_requirements to service_role;

create or replace function private.render_compensation_contract(p_plan_id uuid)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
  p public.comp_plan_versions%rowtype;
  c public.campaigns%rowtype;
  v_label text;
  v_base text;
  v_tiers text;
  v_agent_bonus text;
  v_leadership text;
  v_residual text := '';
  v_window text := '';
  v_promotion text := '';
  v_terms text := '';
  v_payment text;
  v_rule jsonb;
  v_has_residual boolean := false;
begin
  select * into p from public.comp_plan_versions where id=p_plan_id;
  if not found then raise exception 'Compensation plan not found'; end if;
  select * into c from public.campaigns where id=p.campaign_id;
  if not found then raise exception 'Program not found'; end if;

  v_label := coalesce(nullif(p.unit_label,''),nullif(c.unit_label,''),'unit');
  v_base := case p.rate_basis
    when 'percent_of_value' then trim(to_char(p.base_rate,'FM999999990.####')) || '% of verified production value'
    when 'flat' then '$' || trim(to_char(p.base_rate,'FM999999990.00')) || ' flat base compensation when qualifying production is recorded'
    else '$' || trim(to_char(p.base_rate,'FM999999990.00')) || ' per ' || v_label
  end;

  select string_agg(
    '- ' || t.tier_name || ': ' || trim(to_char(t.min_units,'FM999999990.####')) || '+ ' || v_label ||
    case
      when t.benefit_type='rate_override' and p.rate_basis='percent_of_value' then ' → ' || trim(to_char(t.benefit_value,'FM999999990.####')) || '% rate'
      when t.benefit_type='rate_override' then ' → $' || trim(to_char(t.benefit_value,'FM999999990.00')) || ' per ' || v_label
      when t.benefit_type='flat_bonus' then ' → $' || trim(to_char(t.benefit_value,'FM999999990.00')) || ' tier bonus'
      when t.benefit_type='bonus_reference' then ' → linked bonus at ' || trim(to_char(t.bonus_threshold,'FM999999990.####')) || '+ ' || v_label
      else ''
    end,
    E'\n' order by t.tier_order,t.min_units
  ) into v_tiers
  from public.comp_tier_rules t
  where t.plan_version_id=p.id and t.active=true and t.applies_to_role='agent';

  select string_agg(
    '- ' || coalesce(nullif(r.rule_name,''),replace(r.rule_type,'_',' ')) || ': ' ||
    trim(to_char(r.threshold,'FM999999990.####')) || '+ ' || v_label || ' → ' ||
    case r.payout_type
      when 'percent_of_value' then trim(to_char(r.amount,'FM999999990.####')) || '% of qualifying value'
      when 'per_unit_bonus' then '$' || trim(to_char(r.amount,'FM999999990.00')) || ' per qualifying ' || v_label
      else '$' || trim(to_char(r.amount,'FM999999990.00')) || ' bonus'
    end,
    E'\n' order by r.rule_type,r.threshold
  ) into v_agent_bonus
  from public.comp_bonus_rules r
  where r.plan_version_id=p.id and r.active=true and r.applies_to_role='agent';

  select string_agg(
    '- ' || coalesce(nullif(r.rule_name,''),replace(r.rule_type,'_',' ')) || ': ' ||
    trim(to_char(r.threshold,'FM999999990.####')) || '+ ' || v_label || ' • ' || replace(r.aggregation_scope,'_',' ') || ' → ' ||
    case r.payout_type
      when 'percent_of_value' then trim(to_char(r.amount,'FM999999990.####')) || '% of qualifying value'
      when 'per_unit_bonus' then '$' || trim(to_char(r.amount,'FM999999990.00')) || ' per qualifying ' || v_label
      else '$' || trim(to_char(r.amount,'FM999999990.00')) || ' bonus'
    end,
    E'\n' order by r.rule_type,r.threshold
  ) into v_leadership
  from public.comp_bonus_rules r
  where r.plan_version_id=p.id and r.active=true and r.applies_to_role='manager';

  v_payment := 'Payments are issued on the program''s configured payroll schedule. Current arrears setting: ' || p.weekly_arrears_days || ' days.';

  if p.open_enrollment_start_mmdd is not null or p.open_enrollment_end_mmdd is not null or p.reconciliation_end_mmdd is not null then
    v_window := E'\n\n## Program Window / Reconciliation\nConfigured program window: ' || coalesce(p.open_enrollment_start_mmdd,'—') || ' through ' || coalesce(p.open_enrollment_end_mmdd,'—') || '; reconciliation through ' || coalesce(p.reconciliation_end_mmdd,'—') || '. Dates are version-controlled.';
  end if;

  select p.residuals_enabled and (coalesce(p.residual_pool_per_member,0)>0 or exists(select 1 from public.comp_residual_splits s where s.plan_version_id=p.id)) into v_has_residual;
  if v_has_residual then
    select E'\n\n## Residuals\n' ||
      case when coalesce(p.residual_pool_per_member,0)>0 then 'Current configured residual pool: $' || trim(to_char(p.residual_pool_per_member,'FM999999990.0000')) || ' per eligible member.' else '' end ||
      coalesce(E'\n' || string_agg('- Policy year ' || s.policy_year || ' ' || s.beneficiary_role || ': $' || trim(to_char(s.amount_per_member,'FM999999990.0000')) || ' per eligible member',E'\n' order by s.policy_year,s.beneficiary_role),'') ||
      E'\nResidual eligibility is determined by the program''s reconciliation rules.'
    into v_residual
    from public.comp_residual_splits s
    where s.plan_version_id=p.id;
  end if;

  v_rule := p.config->'promotion_rule';
  if v_rule is not null and jsonb_typeof(v_rule)='object' and v_rule <> '{}'::jsonb then
    v_promotion := E'\n\n## Leadership / Promotion Opportunity\n' ||
      case when v_rule ? 'direct_agents_required' then '- Active direct agents required: ' || (v_rule->>'direct_agents_required') || E'\n' else '' end ||
      case when v_rule ? 'team_enrollments_required' then '- Team production required: ' || (v_rule->>'team_enrollments_required') || E'\n' else '' end ||
      case when v_rule ? 'consecutive_months' then '- Consistency requirement: ' || (v_rule->>'consecutive_months') || ' consecutive month(s)' || E'\n' else '' end ||
      case when v_rule ? 'promoter_one_time_bonus' then '- Promoting leader development bonus: $' || trim(to_char((v_rule->>'promoter_one_time_bonus')::numeric,'FM999999990.00')) || E'\n' else '' end;
  end if;

  -- Contract terms are dynamic too. Residual/payment keys are rendered by their controlled sections above.
  select coalesce(E'\n\n## Additional Program Terms\n' || string_agg('- ' || initcap(replace(e.key,'_',' ')) || ': ' || e.value,E'\n' order by e.key),'')
    into v_terms
  from jsonb_each_text(coalesce(p.contract_terms,'{}'::jsonb)) e
  where e.key not in ('residuals','payment');

  return '# ' || c.name || ' Compensation Addendum — Version ' || p.version || E'\n\n' ||
    'Effective ' || p.effective_from || '.' || E'\n\n' ||
    '## Base Compensation' || E'\n' ||
    'Primary metric: ' || p.metric_key || '. Base compensation: ' || v_base || '.' ||
    case when coalesce(v_tiers,'')<>'' then E'\n\n## Agent Earning Tiers\n' || v_tiers else '' end ||
    case when coalesce(v_agent_bonus,'')<>'' then E'\n\n## Agent Bonus Structure\n' || v_agent_bonus else '' end ||
    case when coalesce(v_leadership,'')<>'' then E'\n\n## Leadership Compensation\n' || v_leadership else '' end ||
    E'\n\n## Payment Schedule\n' || v_payment ||
    v_window || v_residual || v_promotion || v_terms ||
    E'\n\n## Version Control\nThis agreement is generated from compensation plan version ' || p.version || '. A published agreement is immutable. Changes to rates, bonuses, tiers, residuals, or other program compensation create a new effective-dated agreement and do not retroactively rewrite earnings or a previously signed version.';
end;
$$;
revoke all on function private.render_compensation_contract(uuid) from public,anon,authenticated;

create or replace function private.sync_compensation_contract(p_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  p public.comp_plan_versions%rowtype;
  c public.campaigns%rowtype;
  v_body text;
  v_contract_id uuid;
  v_status text;
  v_hash text;
begin
  select * into p from public.comp_plan_versions where id=p_plan_id;
  if not found then return null; end if;
  select * into c from public.campaigns where id=p.campaign_id;
  if not found then return null; end if;
  v_body := private.render_compensation_contract(p.id);
  v_hash := md5(v_body);
  v_status := case when p.status='published' then 'published' when p.status='retired' then 'retired' else 'draft' end;

  if v_status='published' then
    update public.contract_plan_versions
      set status='retired', effective_to=(p.effective_from-1),
          generated_at=coalesce(generated_at,now())
    where campaign_id=p.campaign_id and status='published' and comp_plan_version_id<>p.id;
  end if;

  insert into public.contract_plan_versions(
    campaign_id,comp_plan_version_id,version,status,title,body_markdown,body_hash,source_state,
    effective_from,effective_to,created_by,published_by,published_at,generated_at
  ) values (
    p.campaign_id,p.id,p.version,v_status,c.name || ' Compensation Addendum v' || p.version,
    v_body,v_hash,
    jsonb_build_object('comp_plan_version_id',p.id,'plan_version',p.version,'residuals_enabled',p.residuals_enabled,'generated_from','compensation_configuration'),
    p.effective_from,p.effective_to,p.created_by,p.published_by,p.published_at,now()
  )
  on conflict (campaign_id,version) do update set
    comp_plan_version_id=excluded.comp_plan_version_id,
    status=excluded.status,
    title=excluded.title,
    body_markdown=excluded.body_markdown,
    body_hash=excluded.body_hash,
    source_state=excluded.source_state,
    effective_from=excluded.effective_from,
    effective_to=excluded.effective_to,
    published_by=excluded.published_by,
    published_at=excluded.published_at,
    generated_at=now()
  returning id into v_contract_id;

  if v_status='published' then
    insert into public.user_contract_requirements(campaign_id,user_id,contract_version_id,status,created_at,updated_at)
    select a.campaign_id,a.user_id,v_contract_id,
           case when exists(select 1 from public.user_contract_acceptances x where x.user_id=a.user_id and x.contract_version_id=v_contract_id) then 'accepted' else 'pending' end,
           now(),now()
    from public.agent_campaign_assignments a
    where a.campaign_id=p.campaign_id and a.active=true
    on conflict (user_id,contract_version_id) do update set
      status=case when exists(select 1 from public.user_contract_acceptances x where x.user_id=excluded.user_id and x.contract_version_id=excluded.contract_version_id) then 'accepted' else 'pending' end,
      updated_at=now();
  end if;
  return v_contract_id;
end;
$$;
revoke all on function private.sync_compensation_contract(uuid) from public,anon,authenticated;

create or replace function private.comp_contract_plan_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform private.sync_compensation_contract(new.id);
  return new;
end;
$$;
revoke all on function private.comp_contract_plan_trigger() from public,anon,authenticated;

drop trigger if exists comp_plan_living_contract_sync on public.comp_plan_versions;
create trigger comp_plan_living_contract_sync
after insert or update of status,effective_from,effective_to,base_rate,rate_basis,metric_key,unit_label,weekly_arrears_days,payday_dow,open_enrollment_start_mmdd,open_enrollment_end_mmdd,reconciliation_end_mmdd,residual_pool_per_member,residuals_enabled,config,contract_terms
on public.comp_plan_versions
for each row execute function private.comp_contract_plan_trigger();

create or replace function private.comp_contract_child_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_plan uuid;
begin
  v_plan := case when tg_op='DELETE' then old.plan_version_id else new.plan_version_id end;
  perform private.sync_compensation_contract(v_plan);
  return case when tg_op='DELETE' then old else new end;
end;
$$;
revoke all on function private.comp_contract_child_trigger() from public,anon,authenticated;

drop trigger if exists comp_bonus_living_contract_sync on public.comp_bonus_rules;
create trigger comp_bonus_living_contract_sync after insert or update or delete on public.comp_bonus_rules for each row execute function private.comp_contract_child_trigger();
drop trigger if exists comp_tier_living_contract_sync on public.comp_tier_rules;
create trigger comp_tier_living_contract_sync after insert or update or delete on public.comp_tier_rules for each row execute function private.comp_contract_child_trigger();
drop trigger if exists comp_residual_living_contract_sync on public.comp_residual_splits;
create trigger comp_residual_living_contract_sync after insert or update or delete on public.comp_residual_splits for each row execute function private.comp_contract_child_trigger();

create or replace function private.comp_residual_disable_cleanup()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.residuals_enabled=false and old.residuals_enabled is distinct from new.residuals_enabled then
    delete from public.comp_residual_splits where plan_version_id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.comp_residual_disable_cleanup() from public,anon,authenticated;
drop trigger if exists comp_residual_disable_cleanup on public.comp_plan_versions;
create trigger comp_residual_disable_cleanup
after update of residuals_enabled on public.comp_plan_versions
for each row execute function private.comp_residual_disable_cleanup();

create or replace function private.comp_contract_assignment_requirement()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_contract uuid;
begin
  if new.active=true then
    select cv.id into v_contract
    from public.contract_plan_versions cv
    where cv.campaign_id=new.campaign_id and cv.status='published'
    order by cv.version desc limit 1;
    if v_contract is not null then
      insert into public.user_contract_requirements(campaign_id,user_id,contract_version_id,status,created_at,updated_at)
      values(new.campaign_id,new.user_id,v_contract,
        case when exists(select 1 from public.user_contract_acceptances x where x.user_id=new.user_id and x.contract_version_id=v_contract) then 'accepted' else 'pending' end,
        now(),now())
      on conflict (user_id,contract_version_id) do update set updated_at=now();
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.comp_contract_assignment_requirement() from public,anon,authenticated;
drop trigger if exists comp_contract_assignment_requirement on public.agent_campaign_assignments;
create trigger comp_contract_assignment_requirement
after insert or update of active,campaign_id,user_id on public.agent_campaign_assignments
for each row execute function private.comp_contract_assignment_requirement();

create or replace function private.comp_contract_acceptance_audit()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare cv public.contract_plan_versions%rowtype;
begin
  select * into cv from public.contract_plan_versions where id=new.contract_version_id;
  if not found or cv.status<>'published' then
    raise exception 'Only a published compensation agreement can be accepted';
  end if;
  new.metadata := coalesce(new.metadata,'{}'::jsonb) || jsonb_build_object(
    'contract_body_hash',cv.body_hash,
    'contract_version',cv.version,
    'campaign_id',cv.campaign_id,
    'accepted_version_immutable',true
  );
  return new;
end;
$$;
revoke all on function private.comp_contract_acceptance_audit() from public,anon,authenticated;
drop trigger if exists comp_contract_acceptance_audit on public.user_contract_acceptances;
create trigger comp_contract_acceptance_audit
before insert on public.user_contract_acceptances
for each row execute function private.comp_contract_acceptance_audit();

create or replace function private.comp_contract_acceptance_requirement_update()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.user_contract_requirements
    set status='accepted',accepted_at=new.accepted_at,updated_at=now()
  where user_id=new.user_id and contract_version_id=new.contract_version_id;
  return new;
end;
$$;
revoke all on function private.comp_contract_acceptance_requirement_update() from public,anon,authenticated;
drop trigger if exists comp_contract_acceptance_requirement_update on public.user_contract_acceptances;
create trigger comp_contract_acceptance_requirement_update
after insert on public.user_contract_acceptances
for each row execute function private.comp_contract_acceptance_requirement_update();

-- Generate/synchronize contracts for all existing plans without changing signed acceptance history.
do $$ declare r record; begin
  for r in select id from public.comp_plan_versions loop
    perform private.sync_compensation_contract(r.id);
  end loop;
end $$;
