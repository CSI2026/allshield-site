-- B040: represent the already-approved ACA overrides as editable/versioned generic compensation rules.
-- No new payout amounts are introduced here.

with plan as (
  select p.id
  from public.comp_plan_versions p
  join public.campaigns c on c.id=p.campaign_id
  where c.code='ACA_DIALER' and p.status='draft'
  order by p.version desc limit 1
)
insert into public.comp_bonus_rules(
  plan_version_id,rule_type,rule_name,threshold,amount,generation_scope,metadata,
  applies_to_role,metric_key,period,aggregation_scope,payout_type,active
)
select id,'manager_direct_override','Direct Manager Enrollment Override',0,0.25,'direct',
       jsonb_build_object('source','approved_aca_compensation','description','$0.25 per qualified enrollment produced by each direct agent'),
       'manager','qualified_enrollments','monthly','per_direct_member','per_unit_bonus',true
from plan
where not exists (
  select 1 from public.comp_bonus_rules r join plan p on p.id=r.plan_version_id
  where r.rule_type='manager_direct_override' and r.threshold=0
);

with plan as (
  select p.id
  from public.comp_plan_versions p
  join public.campaigns c on c.id=p.campaign_id
  where c.code='ACA_DIALER' and p.status='draft'
  order by p.version desc limit 1
)
insert into public.comp_bonus_rules(
  plan_version_id,rule_type,rule_name,threshold,amount,generation_scope,metadata,
  applies_to_role,metric_key,period,aggregation_scope,payout_type,active
)
select id,'promoting_manager_market','Promoted Market Override',0,0.25,'promoted_market',
       jsonb_build_object('source','approved_aca_compensation','description','$0.25 per enrollment below the first promoted-market volume threshold'),
       'manager','qualified_enrollments','monthly','promoted_market','per_unit_bonus',true
from plan
where not exists (
  select 1 from public.comp_bonus_rules r join plan p on p.id=r.plan_version_id
  where r.rule_type='promoting_manager_market' and r.threshold=0
);
