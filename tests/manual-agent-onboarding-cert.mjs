import fs from 'node:fs';
import { chromium } from 'playwright';

const base=process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com';
const checks=[];
const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});

const index=await (await fetch(base,{cache:'no-store'})).text();
add('Manual onboarding runtime loader',index.includes('manual-agent-onboarding-2026-08-28.js?v=2026.08.28.008'),'v008 loader present');

const moduleText=await (await fetch(`${base}/manual-agent-onboarding-2026-08-28.js?v=${Date.now()}`,{cache:'no-store'})).text();
add('Invite email field deployed',moduleText.includes('Agent Email / Invite Email (Required)')&&moduleText.includes('id="teamEmail"'));
add('Invite delivery help text deployed',moduleText.includes('onboarding invite and temporary login credentials are sent to this address'));
add('Invite action deployed',moduleText.includes('Create Account & Send Invite'));
add('Licensed selector deployed',moduleText.includes('Agent Licensing Status')&&moduleText.includes('value="licensed"')&&moduleText.includes('value="not_licensed"'));
add('Recruiting source deployed',moduleText.includes('Recruiting Source'));
add('Internal identity retained',moduleText.includes('Internal Login Identity')&&moduleText.includes('@allshield.internal'));

const functionSource=fs.readFileSync('supabase/functions/manage-team-user/index.ts','utf8');
add('Server retains internal auth identity',functionSource.includes('@allshield.internal'));
add('Server stores real invite email',functionSource.includes('email:realEmail||null'));
add('Server routes licensed agents',functionSource.includes('licensed_verification')&&functionSource.includes('LICENSED_ONBOARDING'));
add('Server routes non-licensed agents',functionSource.includes('prelicensing')&&functionSource.includes('PRELICENSE_ONBOARDING'));
add('Server sends from onboarding mailbox',functionSource.includes('onboarding@allshieldinsurancegroup.com'));
add('Server uses compliant credential pattern',functionSource.includes('${new Date().getFullYear()}AS'));

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const browserErrors=[];
page.on('pageerror',e=>browserErrors.push(String(e)));
await page.goto(base,{waitUntil:'networkidle',timeout:120000});
const result=await page.evaluate(()=>{
  const ids=['teamFirst','teamLast','teamUsername','teamPassword','teamInternalEmail'];
  for(const id of ids){const e=document.createElement('input');e.id=id;document.body.appendChild(e)}
  document.getElementById('teamFirst').value='Tanita';
  document.getElementById('teamLast').value='Flowers';
  window.syncManualCredentials?.();
  let html='';
  try{html=eval('ownerViews.teamaccounts')||''}catch{}
  return {
    username:document.getElementById('teamUsername').value,
    password:document.getElementById('teamPassword').value,
    internal:document.getElementById('teamInternalEmail').value,
    html
  };
});
add('Username format works',result.username==='Tanita.Flowers',result.username);
add('Temporary password format works',result.password==='TF2026AS',result.password);
add('Internal identity format works',result.internal==='tanita.flowers@allshield.internal',result.internal);
add('Owner form includes invite and routing fields',result.html.includes('teamEmail')&&result.html.includes('teamLicensing')&&result.html.includes('teamSource')&&result.html.includes('Agent Email / Invite Email (Required)'));
add('No browser errors',browserErrors.length===0,browserErrors.join(' | '));
await browser.close();

const passed=checks.filter(x=>x.ok).length;
const output={certification:'ALLSHIELD Manual Agent Onboarding',base_url:base,status:passed===checks.length?'PASS':'FAIL',passed,total:checks.length,checks,completed_at:new Date().toISOString()};
console.log(JSON.stringify(output,null,2));
if(passed!==checks.length)process.exit(1);
