import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  let html='',cfg='';
  for(let i=0;i<45;i++){
    [html,cfg]=await Promise.all([
      fetch(`${BASE}/?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text()),
      fetch(`${BASE}/config.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text())
    ]);
    if(html.includes('config.js?v=2026.08.27.012')&&cfg.includes('onboarding-router-2026-08-27.js?v=2026.08.27.012'))break;
    await sleep(2000);
  }
  const router=await fetch(`${BASE}/onboarding-router-2026-08-27.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text());
  rec('Index uses onboarding cache boundary',html.includes('config.js?v=2026.08.27.012'),'config loader .012');
  rec('Production config loads onboarding router',cfg.includes('onboarding-router-2026-08-27.js?v=2026.08.27.012'),'router .012');
  rec('Router has four current launch states',['TX','FL','GA','TN'].every(s=>router.includes(`${s}:'`)),'TX, FL, GA, TN');
  rec('Team account access is simplified',router.includes('<option value="agent">Agent</option><option value="admin">Admin</option>'),'Agent/Admin only in direct creator');
  rec('Careers license answer is simplified',router.includes('<option value="not_licensed">Not licensed</option><option value="licensed">Licensed</option>'),'Licensed / Not licensed');
  rec('Router has no MutationObserver',!router.includes('MutationObserver'),'none');
  rec('Router has no recurring interval',!router.includes('setInterval('),'none');
  rec('Licensed route exists',router.includes("licensed_verification:'License Verification'"),'license verification');
  rec('Pre-licensing route exists',router.includes("prelicensing:'Pre-Licensing'"),'pre-licensing');
  rec('Contracting follows verification',router.includes('Contracting & e-sign')&&router.includes('license is verified'),'contract step present');

  const url=(cfg.match(/SUPABASE_URL:\s*"([^"]+)"/)||[])[1];
  const key=(cfg.match(/SUPABASE_PUBLISHABLE_KEY:\s*"([^"]+)"/)||[])[1];
  const edgeHeaders={'Content-Type':'application/json','apikey':key||''};
  const [agentEdge,convertEdge]=await Promise.all([
    fetch(`${url}/functions/v1/agent-onboarding`,{method:'POST',headers:edgeHeaders,body:'{"action":"get_context"}'}),
    fetch(`${url}/functions/v1/convert-recruit`,{method:'POST',headers:edgeHeaders,body:'{}'})
  ]);
  rec('Agent onboarding function is deployed',agentEdge.status===401,`HTTP ${agentEdge.status} without login`);
  rec('Applicant conversion function is deployed',convertEdge.status===401,`HTTP ${convertEdge.status} without login`);

  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(`${BASE}/?browsercert=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
  rec('Live homepage loads',response?.ok()===true,`HTTP ${response?.status()}`);
  await page.waitForFunction(()=>window.ALLSHIELD_ONBOARDING_ROUTER_VERSION==='2026.08.27.012',{timeout:20000});
  rec('Onboarding runtime executes in Chrome',await page.evaluate(()=>window.ALLSHIELD_ONBOARDING_ROUTER_VERSION==='2026.08.27.012'),'.012 active');

  const nav=page.locator('.nav-links a').filter({hasText:'Careers'}).first();
  await nav.click();
  await page.waitForFunction(()=>document.getElementById('careersPage')?.classList.contains('show'),{timeout:10000});
  rec('Careers navigation still works',true,'opened');
  const video=page.locator('#careersPage .career-sizzle-frame video').first();
  await video.waitFor({state:'visible',timeout:15000});
  rec('Professional Careers video remains visible',await video.isVisible(),'video visible');

  await page.locator('#careersPage .career-nav-right .btn-primary').click();
  await page.locator('#careerModal.show').waitFor({state:'visible',timeout:10000});
  const opts=await page.locator('#careerModal select option').evaluateAll(xs=>xs.map(x=>({text:x.textContent?.trim(),value:x.value})));
  rec('Career application has exactly two licensing choices',opts.length===2,JSON.stringify(opts));
  rec('Career choices are Licensed / Not licensed',opts.some(x=>x.value==='licensed'&&x.text==='Licensed')&&opts.some(x=>x.value==='not_licensed'&&x.text==='Not licensed'),JSON.stringify(opts));
  await page.locator('#careerModal .close').click();
  await page.evaluate(()=>window.closeCareersPage?.());
  await page.locator('.nav-links .login').click();
  await page.locator('#portalChooser.show').waitFor({state:'visible',timeout:10000});
  rec('Team Portal still responds',true,'chooser open');
  rec('No browser page errors',errors.length===0,errors.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);const out={certification:'ALLSHIELD automated onboarding routing production certification',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
