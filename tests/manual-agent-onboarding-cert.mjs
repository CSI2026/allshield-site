import fs from 'node:fs';
import { chromium } from 'playwright';

const base=process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com';
const checks=[];
const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});

const index=await (await fetch(base,{cache:'no-store'})).text();
add('Manual onboarding runtime loader',index.includes('manual-agent-onboarding-2026-08-28.js?v=2026.08.28.008'),'v008 loader present');
add('Fresh config loader deployed',index.includes('config.js?v=2026.08.28.016'),'2026.08.28.016 config loader present');
add('Direct Team Accounts fail-safe loader deployed',index.includes('team-accounts-invite-override-2026-08-28.js?v=2026.08.28.003'),'v003 direct loader present');

const configText=await (await fetch(`${base}/config.js?v=${Date.now()}`,{cache:'no-store'})).text();
add('Current onboarding router loader deployed',configText.includes('onboarding-router-2026-08-27.js?v=2026.08.28.013'));
add('Priority Team Accounts override loader deployed',configText.includes('team-accounts-invite-override-2026-08-28.js?v=2026.08.28.002'));

const overrideText=await (await fetch(`${base}/team-accounts-invite-override-2026-08-28.js?v=${Date.now()}`,{cache:'no-store'})).text();
add('Priority override targets Owner Team Accounts',overrideText.includes("registerAllshieldView('owner','teamaccounts'")&&overrideText.includes('renderLiveTeamAccounts'));
add('Priority override blocks incomplete legacy form',overrideText.includes('Email-enabled Team Accounts form is not registered'));

const moduleText=await (await fetch(`${base}/manual-agent-onboarding-2026-08-28.js?v=${Date.now()}`,{cache:'no-store'})).text();
add('Invite email field deployed',moduleText.includes('Agent Email / Invite Email (Required)')&&moduleText.includes('id="teamEmail"'));
add('Invite delivery help text deployed',moduleText.includes('onboarding invite and temporary login credentials are sent to this address'));
add('Invite action deployed',moduleText.includes('Create Account & Send Invite'));
add('Licensed selector deployed',moduleText.includes('Agent Licensing Status')&&moduleText.includes('value="licensed"')&&moduleText.includes('value="not_licensed"'));
add('Recruiting source deployed',moduleText.includes('Recruiting Source'));
add('Internal identity retained',moduleText.includes('Internal Login Identity')&&moduleText.includes('@allshield.internal'));

const routerSource=fs.readFileSync('onboarding-router-2026-08-27.js','utf8');
add('Legacy Team Accounts renderer removed from router source',!routerSource.includes("registerAllshieldView('owner','teamaccounts',main=>renderSimpleTeam(main))"));
add('Router protects current invite-email Team Accounts form',routerSource.includes("registerAllshieldView('owner','teamaccounts',main=>{")&&routerSource.includes("current.includes('Agent Email / Invite Email (Required)')"));
add('Router source version is current',routerSource.includes("const VERSION='2026.08.28.013'"));

const functionSource=fs.readFileSync('supabase/functions/manage-team-user/index.ts','utf8');
add('Server retains internal auth identity',functionSource.includes('@allshield.internal'));
add('Server stores real invite email',functionSource.includes('email:realEmail||null'));
add('Server requires agent invite email',functionSource.includes('A valid contact email is required for manual agent onboarding.'));
add('Server routes licensed agents',functionSource.includes('licensed_verification')&&functionSource.includes('LICENSED_ONBOARDING'));
add('Server routes non-licensed agents',functionSource.includes('prelicensing')&&functionSource.includes('PRELICENSE_ONBOARDING'));
add('Server sends from onboarding mailbox',functionSource.includes('onboarding@allshieldinsurancegroup.com'));
add('Server uses compliant credential pattern',functionSource.includes('${new Date().getFullYear()}AS'));

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const browserErrors=[];
page.on('pageerror',e=>browserErrors.push(String(e)));
await page.goto(base,{waitUntil:'networkidle',timeout:120000});
await page.waitForFunction(()=>window.ALLSHIELD_TEAM_ACCOUNTS_INVITE_OVERRIDE_VERSION==='2026.08.28.001',{timeout:30000});

const result=await page.evaluate(async()=>{
  let html='';
  try{html=eval('ownerViews.teamaccounts')||''}catch{}

  window.allshieldListTeamUsers=async()=>[];
  window.allshieldListDepartments=async()=>[];

  let main=document.getElementById('ownerMain');
  let syntheticMount=false;
  if(!main){
    main=document.createElement('main');
    main.id='ownerMain';
    main.setAttribute('data-certification-mount','true');
    document.body.appendChild(main);
    syntheticMount=true;
  }

  const handler=window.allshieldViewHandlers?.owner?.teamaccounts;
  if(typeof handler==='function') await handler(main,'teamaccounts',null);

  const first=main.querySelector('#teamFirst');
  const last=main.querySelector('#teamLast');
  if(first) first.value='Tanita';
  if(last) last.value='Flowers';
  window.syncManualCredentials?.();

  return {
    syntheticMount,
    username:main.querySelector('#teamUsername')?.value||'',
    password:main.querySelector('#teamPassword')?.value||'',
    internal:main.querySelector('#teamInternalEmail')?.value||'',
    html,
    handlerRegistered:typeof handler==='function',
    visibleInviteField:!!main.querySelector('#teamEmail'),
    visibleInviteLabel:[...main.querySelectorAll('label')].some(x=>x.textContent.includes('Agent Email / Invite Email (Required)')),
    visibleInviteButton:[...main.querySelectorAll('button')].some(x=>x.textContent.includes('Create Account & Send Invite')),
    visibleLicensing:!!main.querySelector('#teamLicensing'),
    visibleSource:!!main.querySelector('#teamSource'),
    legacyHeaderVisible:main.textContent?.includes('Keep access simple: Agent or Admin.')||false,
    legacyCreateDirectVisible:main.textContent?.includes('Create Direct Account')||false
  };
});

add('Username format works',result.username==='Tanita.Flowers',result.username);
add('Temporary password format works',result.password==='TF2026AS',result.password);
add('Internal identity format works',result.internal==='tanita.flowers@allshield.internal',result.internal);
add('Owner form source includes invite and routing fields',result.html.includes('teamEmail')&&result.html.includes('teamLicensing')&&result.html.includes('teamSource'));
add('Registered Team Accounts handler exists',result.handlerRegistered);
add('Registered Team Accounts renders invite email',result.visibleInviteField&&result.visibleInviteLabel,result.syntheticMount?'tested in CI certification mount':'tested in live owner mount');
add('Registered Team Accounts renders send-invite action',result.visibleInviteButton);
add('Registered Team Accounts renders agent routing fields',result.visibleLicensing&&result.visibleSource);
add('Legacy Team Accounts screen is no longer rendered',!result.legacyHeaderVisible&&!result.legacyCreateDirectVisible);
add('No browser errors',browserErrors.length===0,browserErrors.join(' | '));
await browser.close();

const passed=checks.filter(x=>x.ok).length;
const output={certification:'ALLSHIELD Manual Agent Onboarding — Legacy Router Blocked + Invite Email Runtime',base_url:base,status:passed===checks.length?'PASS':'FAIL',passed,total:checks.length,checks,completed_at:new Date().toISOString()};
console.log(JSON.stringify(output,null,2));
if(passed!==checks.length)process.exit(1);
