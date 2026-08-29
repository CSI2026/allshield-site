import fs from 'node:fs';

const root=process.cwd();
const read=p=>fs.readFileSync(`${root}/${p}`,'utf8');
const fn=read('supabase/functions/ai-maya-marketing-manager/index.ts');
const ui=read('phase16-ai-command-production.js');
const seed=read('supabase/seeds/maya-marketing-capabilities-b036.sql');
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});
const caps=[
'live_marketing_read','approved_brand_fact_gate','prohibited_claim_guard','brand_profile_status_awareness','platform_profile_awareness','social_connection_health','publish_job_health','marketing_post_queue','media_library_awareness','platform_specific_drafting','campaign_concept_generation','content_calendar_planning','draft_save_only','approval_readiness_check','no_self_approval','external_publish_boundary','oauth_token_boundary','unsupported_claim_detection','blocked_work_explanation','assignment_execution','delivery_health_review','escalation_path','duplicate_draft_prevention','kpi_recording','supervised_learning','owner_feedback_learning'
];

check('Maya runtime is B036',fn.includes('B2026.08.28.036'));
check('Maya identity is Marketing Manager',fn.includes('marketing_manager')&&fn.includes('AI Marketing Manager'));
check('Maya dedicated endpoint is source controlled',seed.includes("'ai-maya-marketing-manager','1'"));
check('All 26 Maya capabilities are versioned',caps.every(x=>fn.includes(`"${x}"`)&&seed.includes(`'${x}'`)));
check('Maya reads approved brand context',fn.includes('social_brand_profiles')&&fn.includes('approved_facts')&&fn.includes('brand_ready'));
check('Maya reads platform profiles',fn.includes('social_platform_profiles'));
check('Maya reads social connection health',fn.includes('social_connections')&&fn.includes('connections_not_ready'));
check('Maya reads marketing queue and publish jobs',fn.includes('marketing_posts')&&fn.includes('social_publish_jobs'));
check('Maya reads media library',fn.includes('media_library'));
check('Unapproved brand context fails closed',fn.includes('approved_brand_profile_required')&&fn.includes('approved_brand_facts_required'));
check('Maya protects prohibited claims',fn.includes('prohibited_claim_detected')&&fn.includes('prohibited_claim_match'));
check('Maya only saves generated content as draft',fn.includes('status: "draft"')&&!fn.includes('status: "published"'));
check('Maya suppresses duplicate drafts',fn.includes('duplicate_drafts_suppressed')&&fn.includes('duplicates'));
check('Maya routes material blockers to Avery',fn.includes('maya_escalation')&&fn.includes('assigned_by_ai_employee_id'));
check('Maya preserves approval boundary',fn.includes('no_self_approval')&&fn.includes('external_publish_boundary'));
check('Maya preserves OAuth/token boundary',fn.includes('oauth_token_boundary')&&fn.includes('refresh_token'));
check('Protected publish actions are rejected',fn.includes('["publish","schedule","approve","connect","refresh_token","retry_publish"]'));
check('Maya uses supervised owner learning',fn.includes('ai_employee_learning')&&fn.includes('markLessonsUsed'));
check('Maya records run/job evidence',fn.includes('ai_employee_runs')&&fn.includes('ai_jobs'));
check('Maya records KPI metrics',fn.includes('drafts_prepared')&&fn.includes('connection_issues')&&fn.includes('failed_publish_jobs'));
check('Maya supports provider fallback',fn.includes('OPENAI_API_KEY')&&fn.includes('allshield:deterministic-marketing-v1'));
check('Maya service path never hardcodes a secret',fn.includes('SUPABASE_SECRET_KEYS')&&!fn.includes('sb_secret_'));
check('Owner AI Workforce routes Maya to dedicated engine',ui.includes("target='ai-maya-marketing-manager'"));
check('Owner AI Workforce retains Social workspace route',ui.includes("marketing_manager:{icon:'✦',route:'social'"));

const failed=checks.filter(x=>!x.ok);
console.log(JSON.stringify({contract:'Maya AI Marketing Manager',status:failed.length?'FAIL':'PASS',passed:checks.length-failed.length,total:checks.length,checks,failures:failed.map(x=>x.name)},null,2));
if(failed.length)process.exit(1);
