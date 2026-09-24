-- New effective-dated ACA version. Published contracts and accrued earnings remain immutable.
-- The first full Monday–Sunday UTC payroll week begins on the next Monday.
do $$
declare
  v_campaign uuid;
  v_old public.comp_plan_versions%rowtype;
  v_new public.comp_plan_versions%rowtype;
  v_effective date := date_trunc('week', current_date)::date + 7;
begin
  select id into strict v_campaign from public.campaigns where code='ACA_DIALER';
  select * into strict v_old from public.comp_plan_versions
    where campaign_id=v_campaign and status='published'
    order by version desc limit 1;

  -- A repeated deployment must never issue another compensation version.
  if coalesce(v_old.config->>'agent_rate_period','')='weekly' then return; end if;

  insert into public.comp_plan_versions
  select (jsonb_populate_record(null::public.comp_plan_versions,
    to_jsonb(v_old) || jsonb_build_object(
      'id',gen_random_uuid(), 'version',(
        select max(version)+1 from public.comp_plan_versions where campaign_id=v_campaign
      ), 'status','draft', 'effective_from',v_effective, 'effective_to',null,
      'created_at',now(), 'published_at',null, 'published_by',null,
      'base_rate',15, 'base_enrollment_amount',15, 'rate_basis','per_unit',
      'metric_key','qualified_enrollments', 'unit_label','qualified enrollment',
      'config',coalesce(v_old.config,'{}'::jsonb) || jsonb_build_object(
        'agent_rate_period','weekly','agent_rate_week_start','monday_utc','agent_rate_threshold',75,
        'agent_rate_at_threshold',20,'agent_rate_retroactive_within_week',true
      ),
      'contract_terms',coalesce(v_old.contract_terms,'{}'::jsonb) || jsonb_build_object(
        'agent_weekly_rate',
        'A qualified enrollment counts in the Monday through Sunday UTC week of its verified qualification timestamp. Fewer than 75 qualified enrollments in that week pay $15 each. At 75 or more, all qualified enrollments in that same week, including the first 74, pay $20 each. Reversed or disqualified enrollments are subject to reconciliation.'
      )
    )
  )).* returning * into v_new;

  -- Copy leadership rules only. The agent's old 250/300 monthly bonuses are removed.
  insert into public.comp_bonus_rules
    (plan_version_id,rule_type,rule_name,threshold,amount,generation_scope,metadata,
     applies_to_role,metric_key,period,aggregation_scope,payout_type,active)
  select v_new.id,rule_type,rule_name,threshold,amount,generation_scope,metadata,
         applies_to_role,metric_key,period,aggregation_scope,payout_type,active
  from public.comp_bonus_rules
  where plan_version_id=v_old.id and applies_to_role='manager';

  insert into public.comp_tier_rules
    (plan_version_id,tier_order,tier_code,tier_name,applies_to_role,metric_key,
     min_units,max_units,benefit_type,benefit_value,metadata)
  values
    (v_new.id,1,'standard','Standard weekly rate','agent','qualified_enrollments',
     0,75,'rate_override',15,jsonb_build_object('period','weekly','week_start','monday_utc')),
    (v_new.id,2,'weekly_75','75+ weekly rate — all weekly enrollments','agent','qualified_enrollments',
     75,null,'rate_override',20,jsonb_build_object('period','weekly','week_start','monday_utc','retroactive_within_week',true));

  insert into public.comp_residual_splits(plan_version_id,policy_year,beneficiary_role,amount_per_member)
  select v_new.id,policy_year,beneficiary_role,amount_per_member
  from public.comp_residual_splits where plan_version_id=v_old.id;

  update public.comp_plan_versions set status='retired',effective_to=v_effective-1
  where campaign_id=v_campaign and status='published';
  update public.comp_plan_versions set status='published',published_at=now()
  where id=v_new.id;

  insert into public.comp_plan_change_log(plan_version_id,actor_id,action,before_state,after_state)
  values(v_new.id,null,'agent_weekly_75_replacement',
    jsonb_build_object('prior_plan_id',v_old.id,'prior_version',v_old.version),
    jsonb_build_object('effective_from',v_effective,'weekly_threshold',75,
      'base_rate',15,'qualified_rate',20,'old_agent_bonuses_removed',true,
      'manager_rules_preserved',true));
end $$;
