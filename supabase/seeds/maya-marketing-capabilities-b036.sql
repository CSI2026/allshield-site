with my as (select id from public.ai_employees where code='marketing_manager')
insert into public.ai_employee_capabilities(
  ai_employee_id,capability_key,capability_label,capability_description,
  execution_mode,requires_human_approval,status,endpoint,version
)
select my.id,v.k,v.l,v.d,v.m,v.a,'enabled','ai-maya-marketing-manager','1'
from my cross join (values
('live_marketing_read','Live marketing read','Read authorized brand, platform profile, connection, marketing draft, media and publish-job data.','read',false),
('approved_brand_fact_gate','Approved brand fact gate','Generate brand content only when an approved brand profile with approved facts exists.','analyze',false),
('prohibited_claim_guard','Prohibited claim guard','Detect and block prohibited brand claims from drafts and queued content.','analyze',false),
('brand_profile_status_awareness','Brand profile status awareness','Distinguish draft versus approved brand context and fail closed when approval is missing.','analyze',false),
('platform_profile_awareness','Platform profile awareness','Use approved platform-specific bios, CTAs, keywords and hashtags when available.','read',false),
('social_connection_health','Social connection health','Monitor platform connection readiness without accessing or changing OAuth tokens.','analyze',false),
('publish_job_health','Publish job health','Inspect failed and pending publish jobs without retrying or publishing autonomously.','analyze',false),
('marketing_post_queue','Marketing post queue','Inspect draft, approved, scheduled, published and failed marketing post states.','analyze',false),
('media_library_awareness','Media library awareness','Use approved media-library context for marketing planning without altering media approvals.','read',false),
('platform_specific_drafting','Platform-specific drafting','Prepare platform-tailored copy from approved ALLSHIELD facts only.','generate',false),
('campaign_concept_generation','Campaign concept generation','Prepare safe campaign concepts grounded in approved brand facts.','generate',false),
('content_calendar_planning','Content calendar planning','Prepare draft content-calendar recommendations without scheduling or publishing externally.','generate',false),
('draft_save_only','Draft save only','Save generated marketing content only as draft records when brand prerequisites are satisfied.','write_internal',false),
('approval_readiness_check','Approval readiness check','Identify which draft and channel prerequisites remain before human approval or publishing.','analyze',false),
('no_self_approval','No self approval','Maya cannot mark brand profiles, platform profiles or marketing posts approved.','write_protected',true),
('external_publish_boundary','External publish boundary','External publishing, scheduling and publish retries require explicit human-controlled workflows.','write_protected',true),
('oauth_token_boundary','OAuth and token boundary','Maya cannot create, replace, refresh or expose social OAuth credentials or tokens.','write_protected',true),
('unsupported_claim_detection','Unsupported claim detection','Flag content that is not grounded in approved facts or conflicts with prohibited-claim rules.','analyze',false),
('blocked_work_explanation','Blocked work explanation','Return a clear safe blocker when approved brand facts or channel prerequisites are missing.','generate',false),
('assignment_execution','Assignment execution','Execute tracked Marketing Manager assignments and retain run/job evidence.','track',false),
('delivery_health_review','Delivery health review','Produce a concise live channel and marketing-delivery health review.','analyze',false),
('escalation_path','Escalation path','Route material marketing blockers to Avery without duplicating open routed work.','delegate',false),
('duplicate_draft_prevention','Duplicate draft prevention','Avoid creating duplicate open marketing drafts for the same platform and content.','analyze',false),
('kpi_recording','KPI recording','Record run metrics supporting Maya marketing KPIs and work history.','track',false),
('supervised_learning','Supervised learning','Apply only active Owner/Admin-approved Maya lessons to future work.','analyze',false),
('owner_feedback_learning','Owner feedback learning','Use the existing measured feedback and teach-employee path without self-authoring lessons.','analyze',false)
) as v(k,l,d,m,a)
on conflict (ai_employee_id,capability_key) do update set
 capability_label=excluded.capability_label,
 capability_description=excluded.capability_description,
 execution_mode=excluded.execution_mode,
 requires_human_approval=excluded.requires_human_approval,
 status='enabled',endpoint='ai-maya-marketing-manager',version='1',updated_at=now();

update public.ai_employees
set config=(coalesce(config,'{}'::jsonb)-'certification_token'-'cert_runner_token') || jsonb_build_object(
 'execution_endpoint','ai-maya-marketing-manager',
 'execution_version','1',
 'certification_required',true,
 'certification_build','B2026.08.28.036',
 'enabled_capabilities',26
),updated_at=now()
where code='marketing_manager';
