import { chromium } from 'playwright';

const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const started=new Date().toISOString();
const checks=[];
const failures=[];
const record=(name,ok,detail='')=>{checks.push({name,ok,detail});if(!ok)failures.push(`${name}: ${detail}`)};

async function fetchText(path){
  const res=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}cert=${Date.now()}`,{redirect:'follow'});
  if(!res.ok) throw new Error(`${path} returned HTTP ${res.status}`);
  return await res.text();
}

async function waitForCurrentDeploy(){
  let last='';
  for(let i=0;i<24;i++){
    try{
      const [app,runtime]=await Promise.all([fetchText('/app.js'),fetchText('/production-runtime.js')]);
      const current=app.includes('__allshieldProductionShellReady') && !/Jordan Miles|Enter Demo Agent Portal|GOOD EVENING, CALVIN/i.test(app) && runtime.includes('__allshieldProductionRuntimeReady');
      if(current) return {app,runtime};
      last='deployment is reachable but still serving an older source';
    }catch(e){last=e.message}
    await new Promise(r=>setTimeout(r,10000));
  }
  throw new Error(last||'current deployment did not become available');
}

let browser;
try{
  const deployed=await waitForCurrentDeploy();
  record('Current production source deployed',true,'app.js and production-runtime.js match the production-only build');
  record('Dormant demo source absent',!/Jordan Miles|Ashley Reed|Marcus Hill|Taylor Brooks|Enter Demo|GOOD EVENING, CALVIN|Interactive demo/i.test(deployed.app),'no legacy sample markers in deployed app.js');

  const html=await fetchText('/');
  record('Homepage responds',/Allshield Insurance Group/i.test(html),'live HTML returned');
  record('Static portal shells are live-only',/LIVE DATA ONLY/i.test(html) && !/Jordan Miles|Ashley Reed|Marcus Hill|Taylor Brooks|Enter Demo/i.test(html),'no sample dashboard markup in deployed index');

  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const pageErrors=[];
  const failedScripts=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('requestfailed',req=>{if(/\.(js|css)(\?|$)/i.test(req.url())) failedScripts.push(`${req.url()} :: ${req.failure()?.errorText||'failed'}`)});

  const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
  record('Browser navigation',!!response && response.ok(),response?`HTTP ${response.status()}`:'no response');
  await page.waitForFunction(()=>window.__allshieldProductionRuntimeReady===true,{timeout:30000});
  record('Production runtime initialized',true,'window.__allshieldProductionRuntimeReady = true');
  record('Demo fallback disabled',await page.evaluate(()=>window.ALLSHIELD_CONFIG?.DEMO_FALLBACK===false),'ALLSHIELD_CONFIG.DEMO_FALLBACK is false');

  const body=await page.locator('body').innerText();
  record('No visible demo/sample content',!/Jordan Miles|Ashley Reed|Marcus Hill|Taylor Brooks|Enter Demo|GOOD EVENING, CALVIN|Interactive demo/i.test(body),'visible page contains no legacy sample content');

  await page.getByRole('button',{name:'Team Portal'}).click();
  await page.getByText('Choose your portal',{exact:false}).waitFor({state:'visible',timeout:10000});
  record('Team Portal chooser opens',true,'role chooser visible');

  for(const [label,role,expected] of [['Agent Portal','agent','Enter Agent Portal'],['Admin Portal','admin','Enter Admin Portal'],['Owner Portal','owner','Enter Owner Portal']]){
    await page.getByText(label,{exact:true}).first().click();
    const login=page.locator(`#${role}Login`);
    await login.waitFor({state:'visible',timeout:10000});
    const buttonText=(await login.locator('button.btn-primary').innerText()).trim();
    record(`${label} secure entry`,buttonText===expected,`button text: ${buttonText}`);
    record(`${label} password field`,await login.locator('input[type="password"]').count()===1,'password field present');
    await login.getByText('Return to website',{exact:false}).click();
    await page.getByRole('button',{name:'Team Portal'}).click();
    await page.getByText('Choose your portal',{exact:false}).waitFor({state:'visible',timeout:10000});
  }

  record('JavaScript page errors',pageErrors.length===0,pageErrors.join(' | ')||'none');
  record('Required JS/CSS resource failures',failedScripts.length===0,failedScripts.join(' | ')||'none');

  await page.screenshot({path:'certification/live-homepage.png',fullPage:true});
}catch(e){
  record('Certification execution',false,e?.stack||e?.message||String(e));
}finally{
  if(browser) await browser.close();
}

const result={
  certification:'ALLSHIELD deployed browser smoke certification',
  base_url:BASE,
  started_at:started,
  completed_at:new Date().toISOString(),
  status:failures.length?'FAIL':'PASS',
  passed:checks.filter(x=>x.ok).length,
  total:checks.length,
  checks,
  failures
};
console.log(JSON.stringify(result,null,2));
process.exitCode=failures.length?1:0;
