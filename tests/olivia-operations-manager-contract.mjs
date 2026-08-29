import fs from 'node:fs';
const read=f=>fs.readFileSync(f,'utf8');
const src=read('supabase/functions/ai-olivia-operations-manager/index.ts');
const ai=read('phase16-ai-command-production.js');
const build=read('build-info.js');
const fail=m=>{throw new Error(m)};
const capabilities=[
  'live_operations_read','master_agent_profile_linkage','manual_onboarding_awareness','career_conversion_monitoring','onboarding_queue_audit','licensed_unlicensed_routing','licensing_verification_monitoring','prelicensing_academy_monitoring','esign_document_monitoring','contracting_readiness','production_readiness','account_lifecycle_monitoring','meeting_monitoring','agent_vendor_communications','admin_queue_monitoring','aging_exception_detection','missing_information_detection','duplicate_consistency_detection','priority_action_planning','assignment_creation','followup_resolution_tracking','escalation_path','operations_briefing','kpi_recording','supervised_learning','authorization_boundaries','duplicate_job_suppression'
];
for(const key of capabilities)if(!src.includes(`"${key}"`))fail(`Olivia capability missing: ${key}`);
const tables=['profiles','onboarding_progress','agent_operational_status','user_state_licenses','academy_module_progress','course_assignments','exam_attempts','document_signatures','user_contract_acceptances','career_applications','company_meetings','crm_tasks','email_threads','agent_mail_aliases','agent_campaign_assignments','ai_jobs','ai_employee_runs','ai_employee_learning'];
for(const table of tables)if(!src.includes(`"${table}"`))fail(`Olivia required production source missing: ${table}`);
const markers=[
  'master_agent_profile_source:"profiles + canonical linked agent records"',
  'source:"olivia_escalation"',
  'routing_key:key',
  'duplicate_suppressed:kept.length',
  'Olivia verified this condition is no longer present in the live operations scan.',
  'requested_by:requestedBy',
  'const requestedBy=await requester(p)',
  'Avery / Owner',
  'Operations Brief',
  'Real Owner/Admin session required',
  'change compensation/production credit',
  'regulated licensing facts',
  'change banking/security roles/permissions',
  'teach_employee',
  'lessons_used'
];
for(const marker of markers)if(!src.includes(marker)&&!ai.includes(marker))fail(`Olivia runtime contract marker missing: ${marker}`);
if(src.includes('requested_by:null'))fail('Olivia may not create tracked AI jobs without a real requester');
if(!src.includes('errText')||!src.includes('JSON.stringify(e)'))fail('Olivia structured runtime error reporting is missing');
if(!ai.includes("getEmployeeByCode('command_center')")||!ai.includes('workforceStatus()')||!ai.includes('employeeDetail(code:string)'))fail('Owner AI Workforce live employee/detail path is missing');
if(!ai.includes("rows('ai_employee_runs'")||!ai.includes("rows('ai_jobs'")||!ai.includes("rows('ai_employee_feedback'")||!ai.includes("rows('ai_employee_learning'"))fail('Owner AI Workforce scorecard/learning sources are incomplete');
if(!build.includes("build_number:'B2026.08.23.021'"))fail('Approved B021 baseline was lost');
console.log(`Olivia Operations Manager source contract: PASS (${capabilities.length}/${capabilities.length} capabilities; canonical Master Agent Profile; routing/follow-up/learning/boundaries present; B021 preserved)`);
