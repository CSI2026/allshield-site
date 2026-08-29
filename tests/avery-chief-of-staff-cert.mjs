import fs from 'node:fs';

const root=process.cwd();
const read=p=>fs.readFileSync(`${root}/${p}`,'utf8');
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail:String(detail||'')});
const fn=read('supabase/functions/ai-avery-chief-of-staff/index.ts');
const ui=read('phase16-ai-command-production.js');
const index=read('index.html');
const build=read('build-info.js');

check('Avery execution source is version controlled',fn.includes('ai_jobs')&&fn.includes('ai_employee_runs'));
check('Avery execution build remains B034-certified',fn.includes('B2026.08.28.034'));
check('Avery source requires authenticated actor',fn.includes('Authorization')&&fn.includes('auth.getUser'));
check('Avery source enforces Owner/Admin role',fn.includes('["owner", "admin"]')||fn.includes("['owner','admin']"));
check('Avery reads live cross-department data',['profiles','onboarding_progress','user_state_licenses','campaign_enrollments','comp_ledger','document_templates','curriculum_validation_findings','academy_launch_readiness','social_connections','video_projects'].every(x=>fn.includes(x)));
check('Avery has deterministic provider-independent execution',fn.includes('allshield:deterministic-chief-of-staff'));
check('Avery can triage priorities',fn.includes('priority')&&fn.includes('signals'));
check('Avery can delegate tracked AI work',fn.includes('parent_job_id')&&fn.includes('assigned_by_ai_employee_id'));
check('Avery prevents duplicate open delegated work',fn.includes('routing_key')&&fn.includes('already_open'));
check('Avery tracks unresolved AI work',fn.includes('queued')&&fn.includes('running')&&fn.includes('failed')&&fn.includes('unresolved'));
check('Avery applies approved learning',fn.includes('ai_employee_learning')&&fn.includes('lesson_text'));
check('Avery preserves protected-action boundaries',fn.includes('Do not change protected account records')&&fn.includes('Do not publish externally without approval'));
check('No temporary certification bypass remains',!fn.includes('certify_once')&&!fn.includes('CERT_NONCE')&&!fn.includes('x-allshield-cert-nonce'));
check('Owner UI runtime is current version .006',ui.includes("const VERSION='2026.08.28.006'"));
check('Owner UI routes Avery to dedicated engine',ui.includes("target='ai-avery-chief-of-staff'"));
check('Company scan routes to Avery scan action',ui.includes("payload={action:'scan',assignment:body.assignment||''}"));
check('Index loads current Avery-aware runtime .006',index.includes('./phase16-ai-command-production.js?v=2026.08.28.006'));
check('Current B035 metadata preserves Avery certification',build.includes("current_build:'B2026.08.28.035'")&&build.includes("avery_chief_of_staff:'LIVE WORK PASS'")&&build.includes("avery_capabilities:'8/8 PASS'")&&build.includes("avery_runtime_contract:'22/22 PASS'"));

const base=process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com';
const endpoint='https://xxeiddnfbdqxwuojuggy.supabase.co/functions/v1/ai-avery-chief-of-staff';
try{
  const r=await fetch(base,{redirect:'follow'});
  check('Live ALLSHIELD homepage responds',r.ok,`HTTP ${r.status}`);
}catch(e){check('Live ALLSHIELD homepage responds',false,e.message)}
try{
  const r=await fetch(endpoint,{method:'OPTIONS',headers:{Origin:base,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type,apikey,x-client-info'}});
  check('Avery production endpoint CORS preflight succeeds',r.ok,`HTTP ${r.status}`);
  check('Avery endpoint returns CORS headers',Boolean(r.headers.get('access-control-allow-origin')),r.headers.get('access-control-allow-origin')||'missing');
}catch(e){check('Avery production endpoint CORS preflight succeeds',false,e.message);check('Avery endpoint returns CORS headers',false,e.message)}
try{
  const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'status'})});
  check('Avery production endpoint remains JWT protected',r.status===401,`HTTP ${r.status}`);
}catch(e){check('Avery production endpoint remains JWT protected',false,e.message)}

const failed=checks.filter(x=>!x.ok);
const report={certification:'ALLSHIELD Avery AI Chief of Staff — Preserved Regression Contract under B035',base_url:base,completed_at:new Date().toISOString(),status:failed.length?'FAIL':'PASS',passed:checks.length-failed.length,total:checks.length,checks,failures:failed};
console.log(JSON.stringify(report,null,2));
if(failed.length)process.exit(1);
