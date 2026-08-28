import fs from 'node:fs';
import { chromium } from 'playwright';

const base=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];
const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
const read=f=>fs.readFileSync(f,'utf8');

const indexSource=read('index.html');
const configSource=read('config.js');
const coreSource=read('agent-operations-core-2026-08-28.js');
const manageSource=read('supabase/functions/manage-team-user/index.ts');
const opsSource=read('supabase/functions/agent-operations/index.ts');
const mailSource=read('supabase/functions/ionos-mail/index.ts');
const phaseSource=read('phase16-live-backoffice.js');
const routerSource=read('onboarding-router-2026-08-27.js');

add('Canonical Agent Operations Core loader',indexSource.includes('agent-operations-core-2026-08-28.js?v=2026.08.28.002'));
add('Legacy manual onboarding loader removed',!indexSource.includes('manual-agent-onboarding-2026-08-28.js'));
add('Legacy Team Accounts override loader removed',!indexSource.includes('team-accounts-invite-override-2026-08-28.js')&&!configSource.includes('allshieldTeamAccountsInviteOverrideLoader'));
add('Onboarding Router no longer owns Team Accounts',!routerSource.includes("registerAllshieldView('owner','teamaccounts'"));
add('Legacy backoffice no longer owns Owner Team Accounts',!phaseSource.includes("registerAllshieldView('owner','teamaccounts',()=>renderTeam"));
add('Legacy backoffice no longer owns Admin dashboard/team',!phaseSource.includes("registerAllshieldView('admin','dashboard',()=>renderAdminDashboard")&&!phaseSource.includes("registerAllshieldView('admin','team',()=>renderTeam"));

for(const marker of ['Create Agent Account','Agent Email / Invite Email (Required)','Phone Number','>Generate<','Create Account & Send Invite','MASTER AGENT PROFILE','ONE AGENT • ONE MASTER FILE','Admin-Only Agent Communications','AGENT EMAIL COMMUNICATIONS']) add(`Core UI marker: ${marker}`,coreSource.includes(marker));
add('Generate fields are read-only',coreSource.includes('id="asGeneratedUsername"')&&coreSource.includes('id="asGeneratedPassword"')&&coreSource.includes('id="asGeneratedIdentity"')&&coreSource.includes('readonly'));
add('Create action is hidden until Generate',coreSource.includes('as-create-action{display:none}')&&coreSource.includes("classList.add('show')"));
add('Owner Team Accounts is canonical in Agent Operations Core',coreSource.includes("registerAllshieldView('owner','teamaccounts'"));
add('Admin dashboard/team are canonical in Agent Operations Core',coreSource.includes("registerAllshieldView('admin','dashboard'")&&coreSource.includes("registerAllshieldView('admin','team'"));
add('Master Agent Profile routes registered',coreSource.includes("registerAllshieldView('admin','agentprofile'")&&coreSource.includes("registerAllshieldView('owner','agentprofile'"));
add('Owner Company Communications preserved',!coreSource.includes("registerAllshieldView('owner','communications',main=>renderCommunications")&&coreSource.includes("registerAllshieldView('owner','agentcommunications'"));
add('Five-tile Admin command center',coreSource.includes('ACTIVE ACCOUNTS')&&coreSource.includes('ONBOARDING USERS')&&coreSource.includes('LICENSE READY')&&coreSource.includes('AVG EXAM SCORE')&&coreSource.includes('AGENT EMAILS'));
add('Dashboard tiles route to exact queues',coreSource.includes("openAdminAgentQueue('active')")||coreSource.includes("onclick=\"openAdminAgentQueue('${kind}')\""));

add('Server exposes preview_credentials',manageSource.includes('action==="preview_credentials"'));
add('Server requires generated credentials before create',manageSource.includes('Generate the username and temporary password before creating the account.'));
add('Server rejects stale generated credentials',manageSource.includes('The generated credentials are no longer current. Click Generate again before creating the account.'));
add('Server supports self-select licensing route',manageSource.includes('onboardingPathway="self_select"'));
add('Server creates operational status',manageSource.includes('agent_operational_status'));
add('Server creates pending external mail alias',manageSource.includes('agent_mail_aliases')&&manageSource.includes('provider_status:"pending_provider"')&&manageSource.includes('@allshieldinsurancegroup.com'));
add('Server creates agent timeline',manageSource.includes('agent_timeline_events'));

for(const marker of ['agent_operational_status','agent_mail_aliases','agent_timeline_events','document_signatures','agent_campaign_assignments','production_entries','comp_ledger','career_applications']) add(`Master file backend includes ${marker}`,opsSource.includes(marker));
add('Thread backend returns verified alias state',opsSource.includes('mail_alias:mailAlias')&&opsSource.includes('provider_status,active,last_verified_at'));
add('Agent Operations requires Owner/Admin',opsSource.includes('Owner/Admin access required'));

add('IONOS sync recognizes agent aliases',mailSource.includes('agent_mail_aliases')&&mailSource.includes('alias_address'));
add('IONOS inbound activates verified alias',mailSource.includes('provider_status:"active"')&&mailSource.includes('last_verified_at'));
add('IONOS inbound links thread to agent',mailSource.includes('agent_id'));
add('IONOS sender requires verified agent alias',mailSource.includes('provider_status')&&mailSource.includes('Sender identity is not approved'));

async function waitLive(){
  for(let i=0;i<36;i++){
    try{
      const text=await (await fetch(`${base}/?cert=${Date.now()}`,{cache:'no-store'})).text();
      if(text.includes('agent-operations-core-2026-08-28.js?v=2026.08.28.002')&&!text.includes('manual-agent-onboarding-2026-08-28.js')&&!text.includes('team-accounts-invite-override-2026-08-28.js'))return true;
    }catch{}
    await new Promise(r=>setTimeout(r,10000));
  }
  return false;
}
add('Canonical B029 source reached production',await waitLive());

const fnRes=await fetch('https://xxeiddnfbdqxwuojuggy.supabase.co/functions/v1/agent-operations',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"action":"dashboard"}'}).catch(()=>null);
add('Agent Operations Edge Function is protected',!!fnRes&&[401,403].includes(fnRes.status),fnRes?`HTTP ${fnRes.status}`:'no response');

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const browserErrors=[];
page.on('pageerror',e=>browserErrors.push(String(e)));
await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction(()=>window.ALLSHIELD_AGENT_OPERATIONS_CORE_VERSION==='2026.08.28.002',{timeout:30000});

const browserResult=await page.evaluate(async()=>{
  const agent={id:'11111111-1111-4111-8111-111111111111',first_name:'Tanita',last_name:'Flowers',username:'Tanita.Flowers',email:'tanita@example.com',phone:'5555551212',role:'agent',status:'onboarding',resident_state:'TX'};
  window.allshieldListTeamUsers=async()=>[agent];
  window.allshieldManageTeamUser=async payload=>{
    if(payload.action==='preview_credentials')return {ok:true,username:'Tanita.Flowers',temp_password:'TF2026AS',internal_email:'tanita.flowers@allshield.internal'};
    return {ok:true};
  };
  window.allshieldSupabase={
    functions:{invoke:async(name,opt)=>{
      const b=opt?.body||{};
      if(name==='agent-operations'&&b.action==='dashboard')return {data:{ok:true,counts:{active_accounts:7,onboarding_users:3,license_ready:5,avg_exam_score:88,agent_email_unread:2}},error:null};
      if(name==='agent-operations'&&b.action==='queue')return {data:{ok:true,kind:b.kind,rows:[{...agent,display_name:'Tanita Flowers',onboarding_open:2,license_ready:false,license_state:'TX',latest_exam_score:88,exam_attempts:2,unread_agent_emails:1}]},error:null};
      if(name==='agent-operations'&&b.action==='profile')return {data:{ok:true,profile:agent,onboarding:[{step_key:'profile',step_order:1,completed:true}],licenses:[],exams:[{exam_type:'practice',score_percent:88,created_at:new Date().toISOString()}],documents:[],campaigns:[],production:[],compensation:[],operations:{lifecycle_stage:'onboarding'},mail_alias:{internal_identity:'tanita.flowers@allshield.internal',alias_address:'tanita.flowers@allshieldinsurancegroup.com',provider_status:'pending_provider',active:true},communications:[],timeline:[{event_type:'account_created',title:'ALLSHIELD agent account created',source:'cert',created_at:new Date().toISOString()}],audit:[],career_application:null},error:null};
      if(name==='agent-operations'&&b.action==='communications')return {data:{ok:true,threads:[]},error:null};
      if(name==='agent-operations'&&b.action==='thread')return {data:{ok:true,thread:{id:'t1',agent_id:agent.id,subject:'Vendor setup',contact_email:'vendor@example.com'},messages:[],mail_alias:{alias_address:'tanita.flowers@allshieldinsurancegroup.com',provider_status:'pending_provider',active:true}},error:null};
      return {data:{ok:true},error:null};
    }}
  };

  const ownerMain=document.getElementById('ownerMain');
  const adminMain=document.getElementById('adminMain');
  const ownerTeam=window.allshieldViewHandlers?.owner?.teamaccounts;
  const adminDash=window.allshieldViewHandlers?.admin?.dashboard;
  const ownerMaster=window.allshieldViewHandlers?.owner?.agentprofile;
  const ownerComms=window.allshieldViewHandlers?.owner?.communications;
  const ownerAgentComms=window.allshieldViewHandlers?.owner?.agentcommunications;

  await ownerTeam(ownerMain,'teamaccounts',null);
  ownerMain.querySelector('#asAgentFirst').value='Tanita';
  ownerMain.querySelector('#asAgentLast').value='Flowers';
  ownerMain.querySelector('#asAgentEmail').value='tanita@example.com';
  await window.asGenerateAgentCredentials();
  const generated={
    username:ownerMain.querySelector('#asGeneratedUsername')?.value,
    password:ownerMain.querySelector('#asGeneratedPassword')?.value,
    internal:ownerMain.querySelector('#asGeneratedIdentity')?.value,
    usernameReadonly:ownerMain.querySelector('#asGeneratedUsername')?.readOnly,
    passwordReadonly:ownerMain.querySelector('#asGeneratedPassword')?.readOnly,
    internalReadonly:ownerMain.querySelector('#asGeneratedIdentity')?.readOnly,
    createVisible:ownerMain.querySelector('#asCreateAgent')?.classList.contains('show'),
    masterButton:ownerMain.textContent.includes('Open Master File')
  };

  await adminDash(adminMain,'dashboard',null);
  const dashboardText=adminMain.innerText;
  const statCount=adminMain.querySelectorAll('.as-command-stat').length;

  window.__asMasterAgentId=agent.id;window.__asMasterRole='owner';
  await ownerMaster(ownerMain,'agentprofile',null);
  const masterText=ownerMain.innerText;
  const masterTabs=[...ownerMain.querySelectorAll('[data-as-tab]')].map(x=>x.textContent.trim());

  return {generated,dashboardText,statCount,masterText,masterTabs,ownerTeam:typeof ownerTeam==='function',adminDash:typeof adminDash==='function',ownerMaster:typeof ownerMaster==='function',companyCommsPreserved:typeof ownerComms==='function'&&String(ownerComms).includes('renderCommunications')===false,agentCommsExists:typeof ownerAgentComms==='function'};
});

add('Owner Team Accounts handler live',browserResult.ownerTeam);
add('Generate produces username',browserResult.generated.username==='Tanita.Flowers',browserResult.generated.username);
add('Generate produces temporary password',browserResult.generated.password==='TF2026AS',browserResult.generated.password);
add('Generate produces internal identity',browserResult.generated.internal==='tanita.flowers@allshield.internal',browserResult.generated.internal);
add('Generated fields remain read-only',browserResult.generated.usernameReadonly&&browserResult.generated.passwordReadonly&&browserResult.generated.internalReadonly);
add('Create becomes available only after Generate',browserResult.generated.createVisible);
add('Team list opens Master Agent Profile',browserResult.generated.masterButton);
add('Admin dashboard live handler',browserResult.adminDash);
add('Admin dashboard has five exact destinations',browserResult.statCount===5,browserResult.statCount);
add('Admin dashboard values render',browserResult.dashboardText.includes('7')&&browserResult.dashboardText.includes('3')&&browserResult.dashboardText.includes('5')&&browserResult.dashboardText.includes('88%')&&browserResult.dashboardText.includes('2'));
add('Master Agent Profile live handler',browserResult.ownerMaster);
add('Master file renders unified identity',browserResult.masterText.includes('MASTER AGENT PROFILE')&&browserResult.masterText.includes('Tanita Flowers')&&browserResult.masterText.includes('tanita.flowers@allshield.internal')&&browserResult.masterText.includes('tanita.flowers@allshieldinsurancegroup.com'));
add('Master file exposes required sections',browserResult.masterTabs.some(x=>x.includes('Onboarding'))&&browserResult.masterTabs.some(x=>x.includes('Licensing'))&&browserResult.masterTabs.some(x=>x.includes('Training & Exams'))&&browserResult.masterTabs.some(x=>x.includes('Documents'))&&browserResult.masterTabs.some(x=>x.includes('Programs & Production'))&&browserResult.masterTabs.some(x=>x.includes('Commissions'))&&browserResult.masterTabs.some(x=>x.includes('Admin Communications'))&&browserResult.masterTabs.some(x=>x.includes('Timeline')));
add('Dedicated Owner agent-communications route exists',browserResult.agentCommsExists);
add('No browser page errors',browserErrors.length===0,browserErrors.join(' | '));
await browser.close();

const passed=checks.filter(x=>x.ok).length;
const output={certification:'ALLSHIELD Agent Operations Core — Team Accounts + Master Agent Profile + Admin Command Center + Agent Email Routing',base_url:base,status:passed===checks.length?'PASS':'FAIL',passed,total:checks.length,checks,completed_at:new Date().toISOString()};
console.log(JSON.stringify(output,null,2));
if(passed!==checks.length)process.exit(1);
