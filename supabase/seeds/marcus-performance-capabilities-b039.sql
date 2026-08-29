-- Marcus / AI Performance & Compensation Analyst — B2026.08.29.039
-- Final seed is applied only after the B039 runtime is certified.
with marcus as (
  select id from public.ai_employees where code='performance_analyst'
), capability(capability_key, capability_label, capability_description, execution_mode, requires_human_approval) as (
  values
  ('live_performance_read','Live performance read','Read current production, enrollment, compensation, payroll and promotion records.','knowledge_work',false),
  ('real_data_only','Real data only','Never fabricate production, earnings, payroll, promotion or performance metrics.','control',false),
  ('data_completeness_awareness','Data completeness awareness','Distinguish zero/empty source data from actual zero performance.','knowledge_work',false),
  ('data_source_provenance','Data source provenance','Report which live tables and sources support each analysis.','knowledge_work',false),
  ('production_trend_analysis','Production trend analysis','Analyze verified production trends by period and agent.','knowledge_work',false),
  ('enrollment_funnel_analysis','Enrollment funnel analysis','Analyze submitted, qualified, card-orderable and residual-eligible enrollments.','knowledge_work',false),
  ('quality_score_analysis','Quality score analysis','Analyze verified quality-score signals without inventing missing QA data.','knowledge_work',false),
  ('period_comparison','Period comparison','Compare verified performance across time periods.','knowledge_work',false),
  ('campaign_comparison','Campaign comparison','Compare verified performance across campaigns when multiple campaigns contain data.','knowledge_work',false),
  ('team_performance_analysis','Team performance analysis','Analyze verified team performance using canonical reporting relationships.','knowledge_work',false),
  ('compensation_plan_read','Compensation plan read','Read compensation plan versions and contract configuration.','knowledge_work',false),
  ('compensation_rule_validation','Compensation rule validation','Compare stored ACA compensation rules with the Owner-approved reference framework.','knowledge_work',false),
  ('compensation_ledger_reconciliation','Compensation ledger reconciliation','Validate ledger mathematics and state consistency without modifying ledger rows.','knowledge_work',false),
  ('payroll_variance_analysis','Payroll variance analysis','Compare payroll gross amounts with payroll item totals.','knowledge_work',false),
  ('payout_schedule_analysis','Payout schedule analysis','Analyze payable dates and recorded payment status.','knowledge_work',false),
  ('bonus_eligibility_analysis','Bonus eligibility analysis','Identify verified bonus milestones and near-threshold opportunities.','knowledge_work',false),
  ('manager_override_analysis','Manager override analysis','Analyze manager override configuration and verified production signals.','knowledge_work',false),
  ('promotion_qualification_analysis','Promotion qualification analysis','Analyze promotion snapshots and qualification controls; recommendation only.','knowledge_work',false),
  ('emerging_leader_detection','Emerging leader detection','Surface verified emerging-leader signals from production and promotion snapshots.','knowledge_work',false),
  ('coaching_opportunity_detection','Coaching opportunity detection','Recommend coaching from verified production, conversion and quality signals.','knowledge_work',false),
  ('threshold_near_miss_detection','Threshold near-miss detection','Surface verified agents close to approved production milestones.','knowledge_work',false),
  ('anomaly_detection','Anomaly detection','Detect material inconsistencies in production, compensation, payroll and promotion data.','knowledge_work',false),
  ('assignment_execution','Assignment execution','Accept tracked performance-analysis assignments and complete them against live data.','execution',false),
  ('tracked_run_evidence','Tracked run evidence','Record completed analysis runs and evidence in the AI workforce tables.','execution',false),
  ('kpi_recording','KPI recording','Use tracked runs and verified findings as evidence for Marcus KPIs.','execution',false),
  ('escalation_path','Escalation path','Route material anomalies to Avery/Owner instead of changing protected records.','execution',false),
  ('duplicate_escalation_suppression','Duplicate escalation suppression','Suppress duplicate open escalations for the same verified issue.','control',false),
  ('recommendation_only_boundary','Recommendation-only boundary','Keep compensation, payroll, promotion and agent-status decisions human controlled.','control',true),
  ('no_compensation_mutation','No compensation mutation','Cannot edit plans, bonus rules, rates or compensation ledger records.','control',true),
  ('no_promotion_mutation','No promotion mutation','Cannot approve or change promotions.','control',true),
  ('no_payroll_mutation','No payroll mutation','Cannot approve, pay or edit payroll.','control',true),
  ('no_status_mutation','No status mutation','Cannot change agent roles, statuses or permissions.','control',true),
  ('supervised_learning','Supervised learning','Use only active Owner/Admin-approved lessons.','learning',true),
  ('owner_feedback_learning','Owner feedback learning','Improve future analysis from approved owner feedback without changing permissions.','learning',true)
), upsert_caps as (
  insert into public.ai_employee_capabilities (
    ai_employee_id,capability_key,capability_label,capability_description,execution_mode,requires_human_approval,status,endpoint,version,updated_at
  )
  select m.id,c.capability_key,c.capability_label,c.capability_description,c.execution_mode,c.requires_human_approval,'enabled','ai-marcus-performance-analyst','1',now()
  from marcus m cross join capability c
  on conflict (ai_employee_id,capability_key) do update set
    capability_label=excluded.capability_label,
    capability_description=excluded.capability_description,
    execution_mode=excluded.execution_mode,
    requires_human_approval=excluded.requires_human_approval,
    status='enabled',endpoint=excluded.endpoint,version=excluded.version,updated_at=now()
  returning ai_employee_id
)
update public.ai_employees e
set job_title='AI Performance & Compensation Analyst',
    department='Performance',
    job_assignment='Analyze production, compensation records, promotion qualification and performance trends; identify anomalies, coaching opportunities and emerging leaders without changing compensation, payroll, promotion or status records.',
    config=coalesce(e.config,'{}'::jsonb) || jsonb_build_object(
      'execution_endpoint','ai-marcus-performance-analyst',
      'execution_version','1',
      'certification_build','B2026.08.29.039',
      'certification_required',true,
      'real_data_only',true,
      'recommendation_only',true,
      'permissions',jsonb_build_array('read_performance','analyze_trends','recommend_coaching','validate_compensation','analyze_payroll','analyze_promotion'),
      'human_approval_boundaries',jsonb_build_array('compensation_changes','payroll_changes','promotion_changes','agent_status_changes','permissions_changes'),
      'owner_approved_aca_reference',jsonb_build_object(
        'base_enrollment_amount',15,
        'agent_monthly',jsonb_build_array(jsonb_build_object('threshold',250,'amount',250),jsonb_build_object('threshold',300,'amount',500)),
        'manager_direct_override_rate',0.25,
        'manager_direct_coaching',jsonb_build_array(jsonb_build_object('threshold',200,'amount',50),jsonb_build_object('threshold',250,'amount',100),jsonb_build_object('threshold',300,'amount',200)),
        'market_monthly',jsonb_build_array(jsonb_build_object('threshold',1000,'amount',1000),jsonb_build_object('threshold',2000,'amount',2500),jsonb_build_object('threshold',3000,'amount',4000)),
        'promotion_rule',jsonb_build_object('direct_agents_required',2,'team_enrollments_required',500,'promoter_one_time_bonus',2500),
        'promoted_market_below_1000_rate',0.25,
        'promoting_manager_market',jsonb_build_array(jsonb_build_object('threshold',1000,'amount',500),jsonb_build_object('threshold',2000,'amount',1250),jsonb_build_object('threshold',3000,'amount',2000))
      )
    ),
    updated_at=now()
from marcus m
where e.id=m.id;
