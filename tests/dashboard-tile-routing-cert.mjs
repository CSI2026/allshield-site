import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];
const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
const read=f=>fs.readFileSync(f,'utf8');

const index=read('index.html');
const owner=read('phase16-owner-live-dashboard.js');
const agent=read('phase16-agent-live-essentials.js');
const admin=read('agent-operations-core-2026-08-28.js');
const ownerBackend=read('supabase/functions/owner-dashboard/index.ts');
const agentOpsBackend=read('supabase/functions/agent-operations/index.ts');

add('Owner dashboard cache boundary current',index.includes('phase16-owner-live-dashboard.js?v=2026.08.28.003'));
add('Agent dashboard cache boundary current',index.includes('phase16-agent-live-essentials.js?v=2026.08.28.002'));
add('Owner has four clickable dashboard tiles',owner.includes('owner-dashboard-stat')&&owner.includes("ownerStat('ACTIVE FIELD AGENTS'")&&owner.includes("ownerStat('STATES REPRESENTED'")&&owner.includes("ownerStat('LICENSING RECORDS'")&&owner.includes("ownerStat('EXAM READY'"));
add('Owner dashboard has exact queue route',owner.includes("registerAllshieldView('owner','dashboardqueue'")&&owner.includes('openOwnerDashboardQueue'));
for(const kind of ['active_agents','states','licensing_records','exam_ready']) add(`Owner queue kind ${kind}`,ownerBackend.includes(`kind===\"${kind}\"`)||ownerBackend.includes(`kind==="${kind}"`));
add('Owner count and queue share valid agent population',ownerBackend.includes('agentIds=new Set')&&ownerBackend.includes('agentProfiles')&&ownerBackend.includes('licenses:l')&&ownerBackend.includes('return json({ok:true,kind,count:rows.length,rows})'));
add('Admin has five clickable command tiles',admin.includes('as-command-stat')&&['ACTIVE ACCOUNTS','ONBOARDING USERS','LICENSE READY','AVG EXAM SCORE','AGENT EMAILS'].every(x=>admin.includes(x)));
add('Admin tiles route through canonical dispatcher',admin.includes('openAdminAgentQueue')&&admin.includes("window.showAdminView?.('agentqueue',null)")&&admin.includes("window.showAdminView?.('communications',null)"));
add('Admin backend filters aggregates to valid agents',agentOpsBackend.includes('agentIds=new Set')&&agentOpsBackend.includes('agentIds.has(x.user_id)')&&agentOpsBackend.includes('agentIds.has(x.agent_id)'));
add('Agent has four clickable dashboard tiles',agent.includes('agent-dashboard-stat')&&agent.includes("agentStat('ONBOARDING'")&&agent.includes("agentStat('LICENSE READINESS'")&&agent.includes("agentStat('LATEST EXAM'")&&agent.includes("agentStat('QUALIFIED RECORDS'"));
for(const route of ['onboarding','licensing','tests','production']) add(`Agent tile route ${route}`,agent.includes(`'${route}'`));

async function live(path){const r=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}cert=${Date.now()}`,{redirect:'follow',cache:'no-store'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return await r.text();}
async function waitLive(){for(let i=0;i<40;i++){try{const [idx,o,a]=await Promise.all([live('/'),live('/phase16-owner-live-dashboard.js'),live('/phase16-agent-live-essentials.js')]);if(idx.includes('phase16-owner-live-dashboard.js?v=2026.08.28.003')&&idx.includes('phase16-agent-live-essentials.js?v=2026.08.28.002')&&o.includes("VERSION='2026.08.28.003'")&&a.includes("VERSION='2026.08.28.002'"))return true;}catch{}await new Promise(r=>setTimeout(r,5000));}return false;}
add('B031 dashboard sources reached live domain',await waitLive());

const protectedRes=await fetch('https://xxeiddnfbdqxwuojuggy.supabase.co/functions/v1/owner-dashboard',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"action":"dashboard"}'}).catch(()=>null);
add('Owner dashboard backend remains protected',!!protectedRes&&[401,403].includes(protectedRes.status),protectedRes?`HTTP ${protectedRes.status}`:'no response');

let browser;
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const r=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:120000});
  add('Live site loads for dashboard certification',!!r&&r.ok(),r?`HTTP ${r.status()}`:'no response');
  await page.waitForFunction(()=>typeof window.allshieldViewHandlers?.owner?.dashboard==='function'&&typeof window.allshieldViewHandlers?.owner?.dashboardqueue==='function'&&typeof window.allshieldViewHandlers?.admin?.dashboard==='function'&&typeof window.allshieldViewHandlers?.agent?.dashboard==='function',{timeout:30000});

  const result=await page.evaluate(async()=>{
    const ownerUser={id:'3320a7d1-bfd6-4761-ad5b-b7fadb3b8d9c',email:'owner@allshield.internal'};
    const agentUser={id:'11111111-1111-4111-8111-111111111111',email:'agent@example.com'};
    const agentProfile={id:agentUser.id,first_name:'Tanita',last_name:'Flowers',username:'Tanita.Flowers',email:agentUser.email,role:'agent',status:'onboarding',resident_state:'TX'};
    const tables={
      profiles:[agentProfile],
      onboarding_progress:[{user_id:agentUser.id,completed:true},{user_id:agentUser.id,completed:false}],
      user_state_licenses:[{id:'l1',user_id:agentUser.id,state_code:'TX',status:'pending',readiness_percent:50,license_type:'life_health'}],
      exam_attempts:[{id:'x1',user_id:agentUser.id,score_percent:80,created_at:new Date().toISOString()}],
      campaign_enrollments:[{id:'e1',agent_id:agentUser.id,status:'qualified',residual_eligible:true,submitted_at:new Date().toISOString()}]
    };
    let currentUser=ownerUser;
    function builder(table){
      let rows=[...(tables[table]||[])];
      let api;
      api=new Proxy({}, {get(_t,p){
        if(p==='then')return resolve=>resolve({data:rows,error:null,count:rows.length});
        if(p==='single'||p==='maybeSingle')return()=>Promise.resolve({data:rows[0]||null,error:null});
        if(['select','order','limit','gte','lte','neq','not','gt','in','is'].includes(p))return()=>api;
        if(p==='eq')return(key,val)=>{rows=rows.filter(x=>String(x[key])===String(val));return api;};
        if(['insert','update','upsert','delete'].includes(p))return()=>api;
        return()=>api;
      }});return api;
    }
    const ownerQueueRows={
      active_agents:[{id:agentUser.id,display_name:'Tanita Flowers',email:agentUser.email,role:'agent',status:'active',resident_state:'TX'}],
      states:[{state_code:'TX',agent_count:1,licensing_records:1,ready_records:0,active_records:0}],
      licensing_records:[{id:'l1',user_id:agentUser.id,display_name:'Tanita Flowers',state_code:'TX',license_type:'life_health',status:'pending',readiness_percent:50}],
      exam_ready:[]
    };
    window.allshieldSupabase={
      auth:{getUser:async()=>({data:{user:currentUser},error:null}),getSession:async()=>({data:{session:{user:currentUser}},error:null})},
      from:t=>builder(t),
      functions:{invoke:async(name,opt)=>{
        const b=opt?.body||{};
        if(name==='owner-dashboard'&&b.action==='dashboard')return {data:{ok:true,metrics:{active_agents:1,states_represented:1,licensing_records:1,exam_ready:0,exam_attempts:1,course_assignments:0,coverage_leads:0,career_applications:0,average_exam_score:80},recent:[],health:{supabase:true,profiles:true,licensing:true,academy:true,courses:true,crm:true,recruiting:true,audit:true}},error:null};
        if(name==='owner-dashboard'&&b.action==='queue'){const rows=ownerQueueRows[b.kind]||[];return {data:{ok:true,kind:b.kind,count:rows.length,rows},error:null};}
        if(name==='agent-operations'&&b.action==='dashboard')return {data:{ok:true,counts:{active_accounts:1,onboarding_users:1,license_ready:1,avg_exam_score:80,agent_email_unread:2}},error:null};
        if(name==='agent-operations'&&b.action==='queue')return {data:{ok:true,kind:b.kind,rows:[{...agentProfile,display_name:'Tanita Flowers',onboarding_open:1,license_ready:true,license_state:'TX',latest_exam_score:80,exam_attempts:1,unread_agent_emails:2}]},error:null};
        if(name==='agent-operations'&&b.action==='communications')return {data:{ok:true,threads:[]},error:null};
        return {data:{ok:true},error:null};
      }}
    };
    document.querySelector('.shell')?.setAttribute('style','display:none!important');
    const ownerMain=document.getElementById('ownerMain'),adminMain=document.getElementById('adminMain'),agentMain=document.getElementById('agentMain');

    await window.allshieldViewHandlers.owner.dashboard(ownerMain,'dashboard',null);
    const ownerButtons=[...ownerMain.querySelectorAll('.owner-dashboard-stat')];
    const ownerKinds=[];const originalOwnerView=window.showOwnerView;
    window.showOwnerView=(route)=>{ownerKinds.push({route,kind:window.__ownerDashboardQueueKind})};
    for(const btn of ownerButtons)btn.click();
    window.showOwnerView=originalOwnerView;
    const ownerQueueChecks={};
    for(const kind of ['active_agents','states','licensing_records','exam_ready']){
      window.__ownerDashboardQueueKind=kind;
      await window.allshieldViewHandlers.owner.dashboardqueue(ownerMain,'dashboardqueue',null);
      ownerQueueChecks[kind]={title:ownerMain.querySelector('h2')?.textContent||'',declared:(ownerMain.querySelector('.dashboard-head p')?.textContent||''),rows:ownerMain.querySelectorAll('tbody tr').length,empty:/No active|No represented|No matching/i.test(ownerMain.innerText)};
    }

    await window.allshieldViewHandlers.admin.dashboard(adminMain,'dashboard',null);
    const adminButtons=[...adminMain.querySelectorAll('.as-command-stat')];
    const adminRoutes=[];const originalAdminView=window.showAdminView;
    window.showAdminView=(route)=>adminRoutes.push({route,kind:window.__asQueueKind});
    for(const btn of adminButtons)btn.click();
    window.showAdminView=originalAdminView;

    currentUser=agentUser;
    await window.allshieldViewHandlers.agent.dashboard(agentMain,'dashboard',null);
    const agentButtons=[...agentMain.querySelectorAll('.agent-dashboard-stat')];
    const agentRoutes=[];const originalAgentView=window.showAgentView;
    window.showAgentView=(route)=>agentRoutes.push(route);
    for(const btn of agentButtons)btn.click();
    window.showAgentView=originalAgentView;

    return {ownerButtonCount:ownerButtons.length,ownerKinds,ownerQueueChecks,adminButtonCount:adminButtons.length,adminRoutes,agentButtonCount:agentButtons.length,agentRoutes};
  });

  add('Owner renders four clickable live tiles',result.ownerButtonCount===4,String(result.ownerButtonCount));
  add('Owner tile click destinations exact',JSON.stringify(result.ownerKinds)===JSON.stringify([
    {route:'dashboardqueue',kind:'active_agents'},
    {route:'dashboardqueue',kind:'states'},
    {route:'dashboardqueue',kind:'licensing_records'},
    {route:'dashboardqueue',kind:'exam_ready'}
  ]),JSON.stringify(result.ownerKinds));
  add('Owner active queue renders exact declared count',result.ownerQueueChecks.active_agents?.declared.includes('1 exact record')&&!result.ownerQueueChecks.active_agents?.empty,result.ownerQueueChecks.active_agents?.declared||'');
  add('Owner states queue renders exact declared count',result.ownerQueueChecks.states?.declared.includes('1 exact record')&&!result.ownerQueueChecks.states?.empty,result.ownerQueueChecks.states?.declared||'');
  add('Owner licensing queue renders exact declared count',result.ownerQueueChecks.licensing_records?.declared.includes('1 exact record')&&!result.ownerQueueChecks.licensing_records?.empty,result.ownerQueueChecks.licensing_records?.declared||'');
  add('Owner zero queue renders zero honestly',result.ownerQueueChecks.exam_ready?.declared.includes('0 exact records')&&result.ownerQueueChecks.exam_ready?.empty,result.ownerQueueChecks.exam_ready?.declared||'');
  add('Admin renders five clickable live tiles',result.adminButtonCount===5,String(result.adminButtonCount));
  add('Admin tile destinations exact',JSON.stringify(result.adminRoutes)===JSON.stringify([
    {route:'agentqueue',kind:'active'},
    {route:'agentqueue',kind:'onboarding'},
    {route:'agentqueue',kind:'license_ready'},
    {route:'agentqueue',kind:'testing'},
    {route:'communications',kind:'agent_email'}
  ]),JSON.stringify(result.adminRoutes));
  add('Agent renders four clickable live tiles',result.agentButtonCount===4,String(result.agentButtonCount));
  add('Agent tile destinations exact',JSON.stringify(result.agentRoutes)===JSON.stringify(['onboarding','licensing','tests','production']),JSON.stringify(result.agentRoutes));
  add('Dashboard tile browser certification has no page errors',errors.length===0,errors.join(' | ')||'none');
} catch(e){add('Dashboard tile browser certification execution',false,e?.stack||e?.message||String(e));}
finally{if(browser)await browser.close();}

const passed=checks.filter(x=>x.ok).length;
const output={certification:'ALLSHIELD Cross-Portal Dashboard Tile Routing',base_url:BASE,status:passed===checks.length?'PASS':'FAIL',passed,total:checks.length,checks,completed_at:new Date().toISOString()};
console.log(JSON.stringify(output,null,2));
if(passed!==checks.length)process.exit(1);
