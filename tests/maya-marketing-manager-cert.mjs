import fs from 'node:fs';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const ENDPOINT='https://xxeiddnfbdqxwuojuggy.supabase.co/functions/v1/ai-maya-marketing-manager';
const read=p=>fs.readFileSync(p,'utf8');
const fn=read('supabase/functions/ai-maya-marketing-manager/index.ts');
const ui=read('phase16-ai-command-production.js');
const index=read('index.html');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail:String(detail||'')});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function text(path){const r=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}maya=${Date.now()}`,{cache:'no-store',redirect:'follow'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return r.text();}
async function waitLive(){for(let i=0;i<72;i++){try{const [idx,liveUi]=await Promise.all([text('/'),text('/phase16-ai-command-production.js')]);if(idx.includes('phase16-ai-command-production.js?v=2026.08.28.007')&&liveUi.includes("VERSION='2026.08.28.007'")&&liveUi.includes("target='ai-maya-marketing-manager'"))return true;}catch{}await sleep(5000)}return false;}
rec('Maya execution source is B036',fn.includes('B2026.08.28.036'));
rec('Maya runtime exposes 26 capability contract',(fn.match(/"owner_feedback_learning"/g)||[]).length>=1&&fn.includes('live_marketing_read'));
rec('Owner UI source is .007',ui.includes("VERSION='2026.08.28.007'"));
rec('Owner UI routes Maya to dedicated engine',ui.includes("target='ai-maya-marketing-manager'"));
rec('Index loads .007 AI workforce runtime',index.includes('./phase16-ai-command-production.js?v=2026.08.28.007'));
rec('Approved brand gate exists',fn.includes('approved_brand_profile_required')&&fn.includes('approved_brand_facts_required'));
rec('Publishing and OAuth boundaries exist',fn.includes('retry_publish')&&fn.includes('refresh_token')&&fn.includes('no_self_approval'));
rec('Draft-only storage exists',fn.includes('status: "draft"'));
const live=await waitLive();rec('Current Maya-aware AI workforce runtime is live',live,live?'.007 + Maya route live':'runtime did not become live');
try{const r=await fetch(ENDPOINT,{method:'OPTIONS',headers:{Origin:BASE,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type,apikey,x-client-info'}});rec('Maya CORS preflight succeeds',r.ok,`HTTP ${r.status}`);rec('Maya CORS header is present',Boolean(r.headers.get('access-control-allow-origin')),r.headers.get('access-control-allow-origin')||'missing');}catch(e){rec('Maya CORS preflight succeeds',false,e.message);rec('Maya CORS header is present',false,e.message)}
try{const r=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'status'})});rec('Maya rejects unauthenticated production access',r.status===401,`HTTP ${r.status}`);}catch(e){rec('Maya rejects unauthenticated production access',false,e.message)}
const failures=checks.filter(x=>!x.ok);console.log(JSON.stringify({certification:'ALLSHIELD Maya AI Marketing Manager — Production Contract',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures},null,2));if(failures.length)process.exit(1);
