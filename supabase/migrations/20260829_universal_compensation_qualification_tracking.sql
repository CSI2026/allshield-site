-- B040: automatic qualification tracking for any compensation-enabled product/program.

create table if not exists public.comp_qualification_snapshots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  plan_version_id uuid not null references public.comp_plan_versions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  qualification_month date not null,
  metric_key text not null,
  units numeric(14,4) not null default 0,
  production_value numeric(14,2) not null default 0,
  current_tier jsonb,
  next_tier jsonb,
  bonus_progress jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique(campaign_id,plan_version_id,user_id,qualification_month)
);

create index if not exists comp_qualification_snapshots_user_idx
  on public.comp_qualification_snapshots(user_id,qualification_month desc);
create index if not exists comp_qualification_snapshots_campaign_idx
  on public.comp_qualification_snapshots(campaign_id,plan_version_id,qualification_month desc);

alter table public.comp_qualification_snapshots enable row level security;
drop policy if exists comp_qualification_snapshots_read on public.comp_qualification_snapshots;
create policy comp_qualification_snapshots_read on public.comp_qualification_snapshots
  for select to authenticated
  using ((select auth.uid())=user_id or private.has_comp_permission('comp.view_all'));
revoke all on public.comp_qualification_snapshots from anon;
grant select on public.comp_qualification_snapshots to authenticated;
grant all on public.comp_qualification_snapshots to service_role;

create or replace function private.refresh_comp_qualification_snapshot(
  p_campaign_id uuid,
  p_user_id uuid,
  p_event_at timestamptz default now()
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month_start date := date_trunc('month',p_event_at)::date;
  v_month_end date := (date_trunc('month',p_event_at) + interval '1 month - 1 day')::date;
  v_plan public.comp_plan_versions%rowtype;
  v_campaign public.campaigns%rowtype;
  v_units numeric(14,4) := 0;
  v_value numeric(14,2) := 0;
  v_current jsonb;
  v_next jsonb;
  v_bonus jsonb := '[]'::jsonb;
begin
  select * into v_campaign from public.campaigns where id=p_campaign_id;
  if not found then return; end if;

  select p.* into v_plan
  from public.comp_plan_versions p
  where p.campaign_id=p_campaign_id
    and p.status='published'
    and p.effective_from<=v_month_end
    and (p.effective_to is null or p.effective_to>=v_month_start)
  order by p.version desc
  limit 1;

  if not found then
    return;
  end if;

  if v_campaign.production_source='campaign_enrollments' then
    select count(*)::numeric,0::numeric into v_units,v_value
    from public.campaign_enrollments e
    where e.campaign_id=p_campaign_id
      and e.agent_id=p_user_id
      and e.status='qualified'
      and e.card_orderable=true
      and e.qualified_at>=v_month_start::timestamptz
      and e.qualified_at<(v_month_end+1)::timestamptz;
  else
    select coalesce(sum(e.units),0),coalesce(sum(e.value_amount),0) into v_units,v_value
    from public.comp_production_events e
    where e.campaign_id=p_campaign_id
      and e.user_id=p_user_id
      and e.status='qualified'
      and e.metric_key=v_plan.metric_key
      and e.occurred_at>=v_month_start::timestamptz
      and e.occurred_at<(v_month_end+1)::timestamptz;
  end if;

  select jsonb_build_object(
    'id',t.id,'tier_code',t.tier_code,'tier_name',t.tier_name,'tier_order',t.tier_order,
    'min_units',t.min_units,'max_units',t.max_units,'benefit_type',t.benefit_type,
    'benefit_value',t.benefit_value,'bonus_rule_type',t.bonus_rule_type,'bonus_threshold',t.bonus_threshold
  ) into v_current
  from public.comp_tier_rules t
  where t.plan_version_id=v_plan.id and t.active=true and t.applies_to_role='agent'
    and t.metric_key=v_plan.metric_key and v_units>=t.min_units
    and (t.max_units is null or v_units<t.max_units)
  order by t.min_units desc,t.tier_order desc limit 1;

  if v_current is null then
    select jsonb_build_object(
      'id',t.id,'tier_code',t.tier_code,'tier_name',t.tier_name,'tier_order',t.tier_order,
      'min_units',t.min_units,'max_units',t.max_units,'benefit_type',t.benefit_type,
      'benefit_value',t.benefit_value,'bonus_rule_type',t.bonus_rule_type,'bonus_threshold',t.bonus_threshold
    ) into v_current
    from public.comp_tier_rules t
    where t.plan_version_id=v_plan.id and t.active=true and t.applies_to_role='agent'
      and t.metric_key=v_plan.metric_key and v_units>=t.min_units
    order by t.min_units desc,t.tier_order desc limit 1;
  end if;

  select jsonb_build_object(
    'id',t.id,'tier_code',t.tier_code,'tier_name',t.tier_name,'tier_order',t.tier_order,
    'min_units',t.min_units,'units_needed',greatest(t.min_units-v_units,0),
    'benefit_type',t.benefit_type,'benefit_value',t.benefit_value,
    'bonus_rule_type',t.bonus_rule_type,'bonus_threshold',t.bonus_threshold
  ) into v_next
  from public.comp_tier_rules t
  where t.plan_version_id=v_plan.id and t.active=true and t.applies_to_role='agent'
    and t.metric_key=v_plan.metric_key and t.min_units>v_units
  order by t.min_units asc,t.tier_order asc limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'rule_id',r.id,'rule_type',r.rule_type,'rule_name',r.rule_name,
    'threshold',r.threshold,'amount',r.amount,'payout_type',r.payout_type,
    'aggregation_scope',r.aggregation_scope,'qualified',(v_units>=r.threshold),
    'units_needed',greatest(r.threshold-v_units,0),
    'payable_at_current_level',(
      v_units>=r.threshold and r.id=(
        select r2.id from public.comp_bonus_rules r2
        where r2.plan_version_id=r.plan_version_id and r2.active=true
          and r2.applies_to_role='agent' and r2.aggregation_scope='self'
          and r2.period='monthly' and r2.metric_key=r.metric_key
          and r2.rule_type=r.rule_type and r2.threshold<=v_units
        order by r2.threshold desc,r2.amount desc limit 1
      )
    )
  ) order by r.rule_type,r.threshold),'[]'::jsonb) into v_bonus
  from public.comp_bonus_rules r
  where r.plan_version_id=v_plan.id and r.active=true
    and r.applies_to_role='agent' and r.aggregation_scope='self'
    and r.period='monthly' and r.metric_key=v_plan.metric_key;

  insert into public.comp_qualification_snapshots(
    campaign_id,plan_version_id,user_id,qualification_month,metric_key,units,production_value,
    current_tier,next_tier,bonus_progress,updated_at
  ) values (
    p_campaign_id,v_plan.id,p_user_id,v_month_start,v_plan.metric_key,v_units,v_value,
    v_current,v_next,v_bonus,now()
  )
  on conflict (campaign_id,plan_version_id,user_id,qualification_month) do update set
    metric_key=excluded.metric_key,units=excluded.units,production_value=excluded.production_value,
    current_tier=excluded.current_tier,next_tier=excluded.next_tier,
    bonus_progress=excluded.bonus_progress,updated_at=now();
end;
$$;

revoke all on function private.refresh_comp_qualification_snapshot(uuid,uuid,timestamptz) from public,anon,authenticated;

create or replace function private.comp_production_event_qualification_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op='DELETE' then
    perform private.refresh_comp_qualification_snapshot(old.campaign_id,old.user_id,old.occurred_at);
    return old;
  end if;
  perform private.refresh_comp_qualification_snapshot(new.campaign_id,new.user_id,new.occurred_at);
  if tg_op='UPDATE' and (old.campaign_id<>new.campaign_id or old.user_id<>new.user_id or date_trunc('month',old.occurred_at)<>date_trunc('month',new.occurred_at)) then
    perform private.refresh_comp_qualification_snapshot(old.campaign_id,old.user_id,old.occurred_at);
  end if;
  return new;
end;
$$;
revoke all on function private.comp_production_event_qualification_trigger() from public,anon,authenticated;

drop trigger if exists comp_production_event_qualification_refresh on public.comp_production_events;
create trigger comp_production_event_qualification_refresh
after insert or update or delete on public.comp_production_events
for each row execute function private.comp_production_event_qualification_trigger();

create or replace function private.campaign_enrollment_qualification_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op='DELETE' then
    if old.qualified_at is not null then
      perform private.refresh_comp_qualification_snapshot(old.campaign_id,old.agent_id,old.qualified_at);
    end if;
    return old;
  end if;
  if new.qualified_at is not null then
    perform private.refresh_comp_qualification_snapshot(new.campaign_id,new.agent_id,new.qualified_at);
  end if;
  if tg_op='UPDATE' and old.qualified_at is not null and (old.campaign_id<>new.campaign_id or old.agent_id<>new.agent_id or date_trunc('month',old.qualified_at)<>date_trunc('month',coalesce(new.qualified_at,old.qualified_at))) then
    perform private.refresh_comp_qualification_snapshot(old.campaign_id,old.agent_id,old.qualified_at);
  end if;
  return new;
end;
$$;
revoke all on function private.campaign_enrollment_qualification_trigger() from public,anon,authenticated;

drop trigger if exists campaign_enrollment_qualification_refresh on public.campaign_enrollments;
create trigger campaign_enrollment_qualification_refresh
after insert or update or delete on public.campaign_enrollments
for each row execute function private.campaign_enrollment_qualification_trigger();
