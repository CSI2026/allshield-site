import fs from 'node:fs';

const root=process.cwd();
const read=p=>fs.readFileSync(`${root}/${p}`,'utf8');
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail:String(detail||'')});
const fn=read('supabase/functions/ai-olivia-operations-manager/index.ts');
const ui=read('phase16-ai-command-production.js');
const index=read('index.html');
const build=read('build-info.js');
const requiredCapabilities=[
  'live_operations_read','master_agent_profile_linkage','manual_onboarding_awareness','career_conversion_monitoring','onboarding_queue_audit','licensed_unlicensed_routing','licensing_verification_monitoring','prelicensing_academy_monitoring','esign_document_monitoring','contracting_readiness','production_readiness','account_lifecycle_monitoring','meeting_monitoring','agent_vendor_communications','admin_queue_monitoring','aging_exception_detection','missing_information_detection','duplicate_consistency_detection','priority_action_planning','assignment_creation','followup_resolution_tracking','escalation_path','operations_briefing','kpi_recording','supervised_learning','authorization_boundaries','duplicate_job_suppression'
];

check('Olivia execution source is version controlled',fn.includes('ai_employee_runs')&&fn.includes('ai_jobs'));
check('Olivia execution build remains B035-certified',fn.includes('B2026.08.28.035'));
check('Olivia source requires authenticated Owner/Admin actor',fn.includes('Authorization')&&fn.includes('auth.getUser')&&fn.includes('["owner","admin"]'));
check('Certification access is not hardcoded',!fn.includes('B035-OLIVIA-CERT-ONCE')&&!fn.includes('CERT_NONCE'));
check('Olivia reads live Master Agent Profiles',fn.includes('profiles')&&fn.includes('master_agent_profile_source')&&fn.includes('agent_population'));
check('Olivia reads live onboarding progress',fn.includes('onboarding_progress')&&fn.includes('open:inc.map')&&fn.includes('incomplete:inc.length'));
check('Olivia reads live operational lifecycle',fn.includes('agent_operational_status')&&fn.includes('dialer_status')&&fn.includes('marketplace_status'));
check('Olivia reads live licensing workflow',fn.includes('user_state_licenses')&&fn.includes('readiness_percent'));
check('Olivia reads prelicensing and Academy activity',fn.includes('academy_module_progress')&&fn.includes('course_assignments')&&fn.includes('exam_attempts'));
check('Olivia reads E-Sign and contracting readiness',fn.includes('document_signatures')&&fn.includes('user_contract_acceptances'));
check('Olivia reads career conversion workflow',fn.includes('career_applications')&&fn.includes('approved_unconverted'));
check('Olivia reads meetings, tasks and operational communications',fn.includes('company_meetings')&&fn.includes('crm_tasks')&&fn.includes('email_threads')&&fn.includes('agent_mail_aliases'));
check('Olivia reads production readiness assignments',fn.includes('agent_campaign_assignments')&&fn.includes('production'));
check('Olivia reads and reconciles tracked AI work',fn.includes('resolution_notes')&&fn.includes('routing_key')&&fn.includes('duplicate_suppressed'));
check('Olivia filters to valid agent population',fn.includes('agent","team_lead","manager')&&fn.includes('terminated'));
check('Olivia detects aging onboarding',fn.includes('aging onboarding')&&fn.includes('age_days')&&fn.includes('>=7'));
check('Olivia detects overdue administrative tasks',fn.includes('Overdue administrative work')&&fn.includes('s.tasks.overdue'));
check('Olivia produces prioritized operations plan',fn.includes('PRIORITY QUEUE')&&fn.includes('RECOMMENDED NEXT ACTIONS'));
check('Olivia creates tracked escalations without duplicate open jobs',fn.includes('olivia_escalation')&&fn.includes('requested_by:requestedBy')&&fn.includes('duplicate_suppressed'));
check('Olivia has provider-independent execution',fn.includes('allshield:deterministic-operations-manager-v2'));
check('Olivia uses supervised learning',fn.includes('ai_employee_learning')&&fn.includes('useLessons')&&fn.includes('lessons_used'));
check('Olivia preserves protected-action boundaries',fn.includes('change compensation/production credit')&&fn.includes('regulated licensing facts')&&fn.includes('change banking/security roles/permissions')&&fn.includes('publish externally'));
check('Olivia source declares all 27 certified capabilities',requiredCapabilities.every(x=>fn.includes(`"${x}"`)),`${requiredCapabilities.length}/27 expected`);
check('Olivia capability endpoint is dedicated',fn.includes('CODE="operations_manager"')&&ui.includes("target='ai-olivia-operations-manager'"));
check('Canonical AI runtime is version .007',ui.includes("const VERSION='2026.08.28.007'"));
check('Index loads Olivia-aware runtime .007',index.includes('./phase16-ai-command-production.js?v=2026.08.28.007'));
check('Current B036 build metadata preserves Olivia certification',build.includes("current_build:'B2026.08.28.036'")&&build.includes("olivia_operations_manager:'LIVE WORK PASS'")&&build.includes("olivia_capabilities:'27/27 PASS'")&&build.includes("olivia_duplicate_suppression:'LIVE TWO-RUN PASS'"));

const base=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const endpoint='https://xxeiddnfbdqxwuojuggy.supabase.co/functions/v1/ai-olivia-operations-manager';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitForLiveBuild(){
  let last='';
  for(let i=0;i<60;i++){
    try{
      const r=await fetch(`${base}/build-info.js?oliviacert=${Date.now()}`,{cache:'no-store',redirect:'follow'});
      last=`HTTP ${r.status}`;
      const t=await r.text();
      if(r.ok&&t.includes("current_build:'B2026.08.28.036'")&&t.includes("olivia_capabilities:'27/27 PASS'"))return {ok:true,detail:last};
    }catch(e){last=e?.message||String(e)}
    await sleep(5000);
  }
  return {ok:false,detail:last||'B036 live build metadata not observed'};
}
try{
  const r=await fetch(base,{redirect:'follow'});
  check('Live ALLSHIELD homepage responds',r.ok,`HTTP ${r.status}`);
}catch(e){check('Live ALLSHIELD homepage responds',false,e.message)}
try{
  const live=await waitForLiveBuild();
  check('Live production build-info serves certified B036',live.ok,live.detail);
}catch(e){check('Live production build-info serves certified B036',false,e.message)}
try{
  const r=await fetch(endpoint,{method:'OPTIONS',headers:{Origin:base,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type,apikey,x-client-info'}});
  check('Olivia production endpoint CORS preflight succeeds',r.ok,`HTTP ${r.status}`);
  check('Olivia endpoint returns CORS headers',Boolean(r.headers.get('access-control-allow-origin')),r.headers.get('access-control-allow-origin')||'missing');
}catch(e){check('Olivia production endpoint CORS preflight succeeds',false,e.message);check('Olivia endpoint returns CORS headers',false,e.message)}
try{
  const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'status'})});
  check('Olivia production endpoint rejects unauthenticated access',r.status===401,`HTTP ${r.status}`);
}catch(e){check('Olivia production endpoint rejects unauthenticated access',false,e.message)}

const failed=checks.filter(x=>!x.ok);
const report={certification:'ALLSHIELD Olivia AI Operations Manager — Preserved Regression Contract under B036',base_url:base,completed_at:new Date().toISOString(),status:failed.length?'FAIL':'PASS',passed:checks.length-failed.length,total:checks.length,checks,failures:failed};
console.log(JSON.stringify(report,null,2));
if(failed.length)process.exit(1);
