with a as (select id from public.ai_employees where code='command_center')
insert into public.ai_employee_capabilities(ai_employee_id,capability_key,capability_label,capability_description,execution_mode,requires_human_approval,status,endpoint,version)
select a.id,v.capability_key,v.capability_label,v.capability_description,v.execution_mode,v.requires_human_approval,'enabled','ai-avery-chief-of-staff','1' from a cross join (values
('cross_department_live_read','Cross-department live read','Read authorized live operational, performance, compliance, academy, marketing and media context.','read',false),
('executive_company_scan','Executive company scan','Perform a company-wide scan against current production data and identify material operating issues.','analyze',false),
('priority_triage','Priority triage','Rank material issues by business impact, urgency and compliance risk.','analyze',false),
('ai_work_delegation','AI work delegation','Create tracked internal work assignments for the correct AI employee without altering protected business records.','delegate',false),
('unresolved_work_tracking','Unresolved work tracking','Track queued, running and failed AI work and surface overdue or unresolved items.','track',false),
('executive_briefing','Executive briefing','Produce concise owner-level operating briefs grounded in live ALLSHIELD data.','generate',false),
('human_feedback_learning','Supervised learning','Apply owner/admin-approved lessons from prior feedback to future Chief of Staff work.','analyze',false),
('authorization_boundaries','Authorization boundaries','Operate only inside approved read, analysis, delegation and internal tracking boundaries; protected actions remain human-controlled.','write_protected',true)
) as v(capability_key,capability_label,capability_description,execution_mode,requires_human_approval)
on conflict (ai_employee_id,capability_key) do update set capability_label=excluded.capability_label,capability_description=excluded.capability_description,execution_mode=excluded.execution_mode,requires_human_approval=excluded.requires_human_approval,status='enabled',endpoint='ai-avery-chief-of-staff',version='1',updated_at=now();

update public.ai_employees
set config = coalesce(config,'{}'::jsonb) || jsonb_build_object(
  'execution_endpoint','ai-avery-chief-of-staff',
  'execution_version','1',
  'certification_required',true,
  'certification_build','B2026.08.28.034'
)
where code='command_center';
