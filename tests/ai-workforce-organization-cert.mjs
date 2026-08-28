import fs from 'node:fs';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const FUNCTION='https://xxeiddnfbdqxwuojuggy.supabase.co/functions/v1/ai-command-center';
const checks=[];
const rec=(name,ok,detail='')=>checks.push({name,ok,detail});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const read=f=>fs.readFileSync(f,'utf8');
const ui=read('phase16-ai-command-production.js');
const schema=read('supabase/migrations/20260828222801_ai_workforce_learning_and_measurement.sql');
const seed=read('supabase/migrations/20260828223234_ai_workforce_roster_seed.sql');
const ownerContract=read('tests/owner-portal-contract.mjs');
const expected=[
 ['command_center','Avery','AI Chief of Staff'],
 ['operations_manager','Olivia','AI Operations Manager'],
 ['performance_analyst','Marcus','AI Performance & Compensation Analyst'],
 ['marketing_manager','Maya','AI Marketing Manager'],
 ['video_editor','Victor','AI Media & Video Producer'],
 ['regulatory_monitor','Riley','AI Compliance & Regulatory Manager'],
 ['licensing_curriculum_manager','Lexi','AI Licensing & Curriculum Director'],
 ['training_coach','Taylor','AI Training Coach'],
 ['testing_analyst','Tessa','AI Testing & Assessment Analyst'],
 ['content_manager','Claire','AI Content Quality Manager']
];
async function text(path){const r=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}aicert=${Date.now()}`,{cache:'no-store',redirect:'follow'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return r.text();}
async function waitLive(){for(let i=0;i<72;i++){try{const [idx,liveUi]=await Promise.all([text('/'),text('/phase16-ai-command-production.js')]);if(idx.includes('phase16-ai-command-production.js?v=2026.08.28.004')&&liveUi.includes("VERSION='2026.08.28.004'"))return;}catch{}await sleep(5000)}throw new Error('B033 AI workforce runtime .004 did not become live in time');}
try{
  rec('AI workforce UI source is version .004',ui.includes("VERSION='2026.08.28.004'"));
  rec('Owner command center uses named workforce',ui.includes('AI WORKFORCE COMMAND CENTER')&&ui.includes('Your measurable AI workforce.'));
  rec('Specific work assignment UI exists',ui.includes('Assign Work')&&ui.includes('allshieldAISubmitAssignment'));
  rec('Scorecard UI exists',ui.includes('Scorecard & Learning')&&ui.includes('allshieldAIEmployeeDetail'));
  rec('Feedback measurement UI exists',ui.includes('Rate & Teach Employee')&&ui.includes('allshieldAISubmitFeedback'));
  rec('Supervised learning explanation exists',ui.includes('How the AI workforce improves')&&ui.includes('Employees cannot change their own permissions'));
  rec('Backward-compatible Live AI entry remains',ui.includes('Ask Live AI — Avery'));
  rec('Agent questions route to authorized Training Coach',ui.includes("role==='agent'?{action:'run',kind:'training_coach',assignment:q}"));
  rec('Owner contract tests new AI workforce markers',ownerContract.includes('AI WORKFORCE COMMAND CENTER')&&ownerContract.includes('Rate & Teach Employee'));
  rec('AI employee schema has job assignments and KPIs',schema.includes('job_assignment text')&&schema.includes('kpis jsonb')&&schema.includes('manager_employee_id'));
  rec('AI feedback table exists',schema.includes('create table if not exists public.ai_employee_feedback'));
  rec('AI learning table exists',schema.includes('create table if not exists public.ai_employee_learning'));
  rec('AI learning is owner/admin protected',schema.includes('private.is_owner_or_admin()'));
  for(const [code,name,title] of expected){
    rec(`${name}: employee code and title are versioned`,seed.includes(`where code='${code}'`)&&seed.includes(`name='${name}'`)&&seed.includes(`job_title='${title}'`));
  }
  rec('Avery is top-level AI Chief of Staff',seed.includes("name='Avery'")&&seed.includes('manager_employee_id=null'));
  rec('Academy team reports through Lexi',seed.includes("manager.code='licensing_curriculum_manager'")&&seed.includes("'training_coach','testing_analyst','content_manager'"));
  rec('Other department leads report through Avery',seed.includes("manager.code='command_center'")&&seed.includes("'operations_manager','performance_analyst','marketing_manager','video_editor','regulatory_monitor','licensing_curriculum_manager'"));
  await waitLive();
  rec('B033 AI workforce runtime is live',true,'.004 loader and runtime live');
  const pre=await fetch(FUNCTION,{method:'OPTIONS',headers:{Origin:BASE,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,x-client-info,apikey,content-type'}});
  const allow=(pre.headers.get('access-control-allow-headers')||'').toLowerCase();
  rec('AI command center CORS preflight succeeds',pre.ok,`HTTP ${pre.status}`);
  rec('AI command center allows current browser headers',['authorization','x-client-info','apikey','content-type'].every(h=>allow.includes(h)),allow);
  const unauth=await fetch(FUNCTION,{method:'POST',headers:{Origin:BASE,'Content-Type':'application/json'},body:JSON.stringify({action:'status'})});
  rec('AI command center remains JWT protected',unauth.status===401,`HTTP ${unauth.status}`);
  rec('AI command center error responses retain CORS',(unauth.headers.get('access-control-allow-origin')||'')!=='','allow-origin='+(unauth.headers.get('access-control-allow-origin')||''));
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}
const failures=checks.filter(x=>!x.ok);
console.log(JSON.stringify({certification:'ALLSHIELD Named Measurable Learning AI Workforce',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)},null,2));
process.exitCode=failures.length?1:0;
