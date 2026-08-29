with ol as (select id from public.ai_employees where code='operations_manager')
insert into public.ai_employee_capabilities(
  ai_employee_id,capability_key,capability_label,capability_description,
  execution_mode,requires_human_approval,status,endpoint,version
)
select ol.id,v.capability_key,v.capability_label,v.capability_description,
       v.execution_mode,v.requires_human_approval,'enabled','ai-olivia-operations-manager','1'
from ol cross join (values
('live_operations_read','Live operations read','Read authorized live agent, onboarding, licensing, meeting, task and AI work-queue data.','read',false),
('valid_agent_population','Valid agent population control','Restrict operational counts and queues to current agent, team lead and manager profiles so stale/non-agent records do not inflate workload.','analyze',false),
('onboarding_queue_audit','Onboarding queue audit','Inspect incomplete onboarding steps by valid agent and identify blockers and aging work.','analyze',false),
('account_lifecycle_monitoring','Account lifecycle monitoring','Monitor agent lifecycle, background, financial setup, coding, dialer and marketplace progression without changing protected status.','analyze',false),
('licensing_workflow_monitoring','Licensing workflow monitoring','Inspect state license records and readiness to identify missing or not-ready licensing work.','analyze',false),
('meeting_task_monitoring','Meeting and task monitoring','Review scheduled company meetings plus open and overdue operating tasks.','analyze',false),
('aging_exception_detection','Aging exception detection','Detect overdue tasks, aging onboarding records, failed work and other material operational exceptions.','analyze',false),
('priority_action_planning','Priority action planning','Turn live exceptions into a ranked internal operations action plan.','generate',false),
('followup_resolution_tracking','Follow-up and resolution tracking','Execute and close Olivia-owned AI work, preserve resolution notes and keep unresolved work visible.','track',false),
('supervised_learning','Supervised learning','Apply owner/admin-approved lessons from prior Olivia work to future operations reviews.','analyze',false),
('authorization_boundaries','Authorization boundaries','Never change account status, licensing status, compensation, signatures, permissions, regulated content, external publishing or destructive records without human authorization.','write_protected',true)
) as v(capability_key,capability_label,capability_description,execution_mode,requires_human_approval)
on conflict (ai_employee_id,capability_key) do update set
  capability_label=excluded.capability_label,
  capability_description=excluded.capability_description,
  execution_mode=excluded.execution_mode,
  requires_human_approval=excluded.requires_human_approval,
  status='enabled',endpoint='ai-olivia-operations-manager',version='1',updated_at=now();

update public.ai_employees
set config=(coalesce(config,'{}'::jsonb)-'certification_token') || jsonb_build_object(
  'execution_endpoint','ai-olivia-operations-manager',
  'execution_version','1',
  'certification_required',true,
  'certification_build','B2026.08.28.035'
), updated_at=now()
where code='operations_manager';
