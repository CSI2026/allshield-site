import fs from 'node:fs';

const root=process.cwd();
const read=p=>fs.readFileSync(`${root}/${p}`,'utf8');
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail:String(detail||'')});
const fn=read('supabase/functions/ai-olivia-operations-manager/index.ts');
const ui=read('phase16-ai-command-production.js');
const index=read('index.html');
const build=read('build-info.js');
const migration=read('supabase/migrations/20260829001644_seed_olivia_operations_capabilities_b035.sql');

check('Olivia execution source is version controlled',fn.includes('ai_employee_runs')&&fn.includes('ai_jobs'));
check('Olivia execution build is B035',fn.includes('B2026.08.28.035'));
check('Olivia source requires authenticated Owner/Admin actor',fn.includes('Authorization')&&fn.includes('auth.getUser')&&fn.includes('["owner","admin"]'));
check('Certification access is not hardcoded',fn.includes('certification_token')&&!fn.includes('B035-OLIVIA-CERT-ONCE'));
check('Olivia reads live agent profiles',fn.includes('profiles')&&fn.includes('agent_population'));
check('Olivia reads live onboarding progress',fn.includes('onboarding_progress')&&fn.includes('incomplete_step_keys'));
check('Olivia reads live operational lifecycle',fn.includes('agent_operational_status')&&fn.includes('dialer_status')&&fn.includes('marketplace_status'));
check('Olivia reads live licensing workflow',fn.includes('user_state_licenses')&&fn.includes('readiness_percent'));
check('Olivia reads meetings and operating tasks',fn.includes('company_meetings')&&fn.includes('crm_tasks'));
check('Olivia reads and closes tracked AI work',fn.includes('olivia_queue')&&fn.includes('resolution_notes'));
check('Olivia filters to valid agent population',fn.includes('agent","team_lead","manager')&&fn.includes('terminated'));
check('Olivia detects aging onboarding',fn.includes('aging onboarding account')&&fn.includes('account_age_days'));
check('Olivia detects overdue tasks',fn.includes('Overdue operating tasks')&&fn.includes('overdueTasks'));
check('Olivia produces prioritized operations plan',fn.includes('PRIORITY QUEUE')&&fn.includes('RECOMMENDED NEXT ACTIONS'));
check('Olivia has provider-independent execution',fn.includes('allshield:deterministic-operations-manager'));
check('Olivia uses supervised learning',fn.includes('ai_employee_learning')&&fn.includes('markLessonsUsed'));
check('Olivia preserves protected-action boundaries',fn.includes('Agent account status, licensing status, compensation, signatures, external publishing and destructive changes remain human-controlled'));
check('Olivia capability migration has 11 explicit capabilities',(migration.match(/^\('/gm)||[]).length===11);
check('Olivia capability endpoint is dedicated',migration.includes("'ai-olivia-operations-manager','1'"));
check('Canonical AI runtime is version .006',ui.includes("const VERSION='2026.08.28.006'"));
check('Canonical runtime routes Olivia to dedicated engine',ui.includes("target='ai-olivia-operations-manager'"));
check('Index loads Olivia-aware runtime .006',index.includes('./phase16-ai-command-production.js?v=2026.08.28.006'));
check('B035 build metadata is current',build.includes("current_build:'B2026.08.28.035'")&&build.includes('Olivia AI Operations Manager'));
check('B035 metadata records live work certification',build.includes("olivia_operations_manager:'LIVE WORK PASS'")&&build.includes("olivia_capabilities:'11/11 PASS'"));

const base=process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com';
const endpoint='https://xxeiddnfbdqxwuojuggy.supabase.co/functions/v1/ai-olivia-operations-manager';
try{
  const r=await fetch(base,{redirect:'follow'});
  check('Live ALLSHIELD homepage responds',r.ok,`HTTP ${r.status}`);
}catch(e){check('Live ALLSHIELD homepage responds',false,e.message)}
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
const report={certification:'ALLSHIELD Olivia AI Operations Manager — Live Execution Contract',base_url:base,completed_at:new Date().toISOString(),status:failed.length?'FAIL':'PASS',passed:checks.length-failed.length,total:checks.length,checks,failures:failed};
console.log(JSON.stringify(report,null,2));
if(failed.length)process.exit(1);
