-- ACA Dialer compensation v2, effective Monday 2026-09-14.
-- Replaces individual agent monthly bonuses with a weekly all-units rate tier.
-- Manager coaching, team/market performance, and override rules are preserved.

do $$
declare
  v_campaign_id uuid;
  v_source_plan_id uuid;
  v_new_plan_id uuid := gen_random_uuid();
  v_owner_id uuid;
begin
  select id into strict v_campaign_id
  from public.campaigns
  where code = 'ACA_DIALER';

  select id into strict v_source_plan_id
  from public.comp_plan_versions
  where campaign_id = v_campaign_id and status = 'published'
  order by version desc
  limit 1;

  -- Idempotency: do nothing when this effective-dated version already exists.
  if exists (
    select 1 from public.comp_plan_versions
    where campaign_id = v_campaign_id
      and version = 2
      and effective_from = date '2026-09-14'
  ) then
    return;
  end if;

  select id into v_owner_id
  from public.profiles
  where role::text = 'owner'
  order by created_at
  limit 1;

  insert into public.comp_plan_versions (
    id, campaign_id, version, status, effective_from, effective_to,
    base_enrollment_amount, weekly_arrears_days, payday_dow,
    open_enrollment_start_mmdd, open_enrollment_end_mmdd,
    reconciliation_end_mmdd, residual_pool_per_member,
    config, contract_terms, created_by,
    base_rate, rate_basis, metric_key, unit_label, residuals_enabled
  )
  select
    v_new_plan_id, p.campaign_id, 2, 'draft', date '2026-09-14', null,
    15.00, p.weekly_arrears_days, p.payday_dow,
    p.open_enrollment_start_mmdd, p.open_enrollment_end_mmdd,
    p.reconciliation_end_mmdd, p.residual_pool_per_member,
    (p.config - 'monthly_agent_bonus_payday') || jsonb_build_object(
      'agent_rate_tier_period', 'weekly',
      'agent_rate_tier_week_starts', 'monday',
      'agent_rate_tier_scope', 'all_qualified_enrollments_in_week',
      'agent_rate_tier_threshold', 75,
      'agent_standard_rate', 15,
      'agent_performance_rate', 20,
      'individual_agent_bonuses_enabled', false
    ),
    jsonb_build_object(
      'campaign', 'ACA Dialer Campaign',
      'payment', 'Weekly Friday, two weeks in arrears',
      'agent_rate_tier', '$15 per qualified enrollment for 0-74 in a Monday-Sunday week; at 75 or more, $20 applies to every qualified enrollment in that week',
      'individual_agent_bonuses', 'No separate individual agent performance bonuses apply under this version',
      'manager_compensation', 'Manager team, direct-agent performance, coaching, market, promotion, and override compensation remains unchanged',
      'agent_chargebacks', 'None on qualified enrollments',
      'residuals', 'Subject to reconciliation and active plan version'
    ),
    v_owner_id,
    15.00, p.rate_basis, p.metric_key, p.unit_label, p.residuals_enabled
  from public.comp_plan_versions p
  where p.id = v_source_plan_id;

  -- Preserve manager-only bonuses exactly. Do not carry forward old agent bonuses.
  insert into public.comp_bonus_rules (
    plan_version_id, rule_type, threshold, amount, generation_scope, metadata,
    rule_name, applies_to_role, metric_key, period, aggregation_scope,
    payout_type, active
  )
  select
    v_new_plan_id, rule_type, threshold, amount, generation_scope, metadata,
    rule_name, applies_to_role, metric_key, period, aggregation_scope,
    payout_type, active
  from public.comp_bonus_rules
  where plan_version_id = v_source_plan_id
    and applies_to_role = 'manager';

  insert into public.comp_tier_rules (
    plan_version_id, tier_order, tier_code, tier_name, applies_to_role,
    metric_key, min_units, max_units, benefit_type, benefit_value,
    bonus_rule_type, bonus_threshold, active, metadata
  ) values
    (
      v_new_plan_id, 1, 'standard_weekly', 'Standard Weekly Rate', 'agent',
      'qualified_enrollments', 0, 75, 'rate_override', 15,
      null, null, true,
      '{"period":"weekly","week_starts":"monday","scope":"all_units_in_period","upper_bound_exclusive":true}'::jsonb
    ),
    (
      v_new_plan_id, 2, 'weekly_75', '75+ Weekly Performance Rate', 'agent',
      'qualified_enrollments', 75, null, 'rate_override', 20,
      null, null, true,
      '{"period":"weekly","week_starts":"monday","scope":"all_units_in_period"}'::jsonb
    );

  insert into public.comp_residual_splits (
    plan_version_id, policy_year, beneficiary_role, amount_per_member
  )
  select v_new_plan_id, policy_year, beneficiary_role, amount_per_member
  from public.comp_residual_splits
  where plan_version_id = v_source_plan_id;

  insert into public.comp_plan_change_log (
    plan_version_id, actor_id, action, before_state, after_state
  ) values (
    v_new_plan_id, v_owner_id, 'draft_created', null,
    jsonb_build_object(
      'reason', 'Replace old individual agent bonuses with weekly 75-enrollment rate tier',
      'effective_from', '2026-09-14',
      'standard_rate', 15,
      'performance_threshold', 75,
      'performance_rate', 20,
      'manager_bonus_rules_preserved', true
    )
  );

  update public.comp_plan_versions
  set status = 'retired', effective_to = date '2026-09-13'
  where id = v_source_plan_id;

  update public.comp_plan_versions
  set status = 'published', published_by = v_owner_id, published_at = now()
  where id = v_new_plan_id;

  insert into public.comp_plan_change_log (
    plan_version_id, actor_id, action, before_state, after_state
  ) values (
    v_new_plan_id, v_owner_id, 'published', null,
    jsonb_build_object(
      'effective_from', '2026-09-14',
      'agent_tier', '$15 for 0-74 weekly; $20 for all weekly units at 75+',
      'individual_agent_bonuses_removed', true,
      'manager_bonus_rules_preserved', true
    )
  );
end
$$;
