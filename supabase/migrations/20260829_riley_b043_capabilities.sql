-- B043 Riley AI Compliance & Regulatory Manager capability registry.
do $$
declare v_id uuid;
begin
  select id into v_id from public.ai_employees where code='regulatory_monitor';
  if v_id is null then raise exception 'Riley regulatory_monitor missing'; end if;
  update public.ai_employees set
    job_title='AI Compliance & Regulatory Manager',department='Compliance',status='active',autonomy_level='managed',
    job_assignment='Monitor authoritative regulatory, exam-vendor, licensing, signature and validation evidence; detect source changes and effective dates; create review findings and escalation evidence; never auto-publish regulated changes, alter exam blueprints, or clear a license without authorized human action.',
    config=coalesce(config,'{}'::jsonb)||jsonb_build_object(
      'permissions',jsonb_build_array('read_authoritative_sources','run_authoritative_source_checks','flag_changes','create_review_findings','review_license_state','review_signature_compliance'),
      'human_approval_required',true,
      'auto_publish',false,
      'required_authority_rank',95,
      'freshness_target_hours',72,
      'learning_policy',jsonb_build_object('mode','supervised','may_self_publish',false,'use_active_lessons',true,'may_change_permissions',false,'regulated_changes_require_human',true),
      'human_approval_boundaries',jsonb_build_array('activate_regulatory_change','publish_curriculum','change_exam_blueprint','clear_license','resolve_finding')
    ),updated_at=now()
  where id=v_id;
  delete from public.ai_employee_capabilities where ai_employee_id=v_id;
  insert into public.ai_employee_capabilities(ai_employee_id,capability_key,capability_label,capability_description,execution_mode,requires_human_approval,status,endpoint,version)
  select v_id,x.key,x.label,x.description,x.mode,x.approval,'enabled','ai-riley-regulatory-monitor','1'
  from (values
    ('authoritative_source_registry_read','Authoritative source registry read','Read the controlled regulator/government/exam-vendor source registry.','read',false),
    ('authority_rank_validation','Authority rank validation','Validate active sources meet the configured authority threshold.','analyze',false),
    ('source_freshness_analysis','Source freshness analysis','Identify authoritative sources outside the freshness target.','analyze',false),
    ('source_fingerprint_monitoring','Source fingerprint monitoring','Compare Riley-controlled source fingerprints without auto-applying changes.','analyze',false),
    ('source_fetch_evidence','Source fetch evidence','Record HTTP/fingerprint evidence from authoritative source checks.','track',false),
    ('source_fetch_failure_tracking','Source fetch failure tracking','Track fetch failures without falsely claiming successful verification.','track',false),
    ('regulatory_change_detection','Regulatory change detection','Create needs-review events when a previously baselined authoritative source changes.','write_internal',false),
    ('regulatory_change_duplicate_suppression','Regulatory change duplicate suppression','Avoid duplicate open events for the same observed fingerprint.','analyze',false),
    ('change_review_queue_awareness','Change review queue awareness','Read detected/needs-review regulatory change events.','read',false),
    ('future_effective_date_awareness','Future effective date awareness','Surface near-term effective dates requiring verification.','analyze',false),
    ('exam_blueprint_review','Exam blueprint review','Review active and staged exam blueprint evidence.','read',false),
    ('blueprint_activation_guard','Blueprint activation guard','Prevent Riley from activating/changing regulated blueprints.','analyze',true),
    ('validation_finding_review','Validation finding review','Read validation findings and severity/confidence evidence.','read',false),
    ('open_finding_followup','Open finding follow-up','Identify unresolved validation findings for human follow-up.','analyze',false),
    ('monitor_run_review','Monitor run review','Review prior regulatory monitoring runs and outcomes.','read',false),
    ('monitor_run_evidence','Monitor run evidence','Create real source-monitor run records with completed/partial status.','track',false),
    ('jurisdiction_coverage_review','Jurisdiction coverage review','Review source coverage across tracked jurisdictions.','analyze',false),
    ('marketplace_rule_awareness','Marketplace rule awareness','Read authoritative Marketplace training/certification sources.','read',false),
    ('licensing_requirement_awareness','Licensing requirement awareness','Read authoritative state licensing requirement sources.','read',false),
    ('state_license_record_review','State license record review','Read stored license status/readiness/number/expiration evidence.','read',false),
    ('license_clearance_fail_closed','License clearance fail closed','Never infer an active license without supporting stored evidence.','analyze',false),
    ('license_expiration_awareness','License expiration awareness','Surface stored active licenses nearing expiration.','analyze',false),
    ('onboarding_compliance_gap_review','Onboarding compliance gap review','Surface onboarding/licensing gaps without automatically blocking or clearing agents.','analyze',false),
    ('contract_acceptance_awareness','Contract acceptance awareness','Review living agreement requirement state.','read',false),
    ('signature_compliance_awareness','Signature compliance awareness','Distinguish pending from accepted agreement evidence.','analyze',false),
    ('source_conflict_awareness','Source conflict awareness','Fail closed on unresolved authoritative-source conflicts.','analyze',false),
    ('uncertainty_escalation','Uncertainty escalation','Escalate authoritative uncertainty rather than guessing.','delegate',false),
    ('avery_escalation_path','Avery escalation path','Route material compliance blockers to Avery.','delegate',false),
    ('duplicate_escalation_suppression','Duplicate escalation suppression','Avoid redundant open Avery escalations.','analyze',false),
    ('assignment_execution','Assignment execution','Execute tracked Owner/Avery compliance assignments.','write_internal',false),
    ('tracked_run_evidence','Tracked run evidence','Record Riley run evidence in AI employee history.','track',false),
    ('kpi_recording','KPI recording','Record evidence for regulatory monitoring KPIs.','track',false),
    ('supervised_learning','Supervised learning','Use active human-approved learning lessons only.','read',false),
    ('owner_feedback_learning','Owner feedback learning','Apply approved Owner/Admin feedback lessons.','read',false),
    ('no_auto_publish_boundary','No auto-publish boundary','Riley cannot publish regulated content.','analyze',true),
    ('no_regulated_activation_boundary','No regulated activation boundary','Riley cannot activate detected regulatory changes.','analyze',true),
    ('no_blueprint_change_boundary','No blueprint change boundary','Riley cannot change or activate exam blueprints.','analyze',true),
    ('no_license_clearance_boundary','No license clearance boundary','Riley cannot mark a user licensed or clear a license.','analyze',true),
    ('no_fabricated_regulatory_claims_boundary','No fabricated regulatory claims boundary','Riley cannot invent regulatory facts or claim unverified freshness.','analyze',true)
  ) as x(key,label,description,mode,approval);
end $$;
