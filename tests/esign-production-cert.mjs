import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function text(path){const r=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}esignaudit=${Date.now()}`,{cache:'no-store',redirect:'follow'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return r.text();}
async function waitDeploy(){for(let i=0;i<72;i++){try{const [cfg,e,b]=await Promise.all([text('/config.js'),text('/esign-agreements-2026-08-28.js'),text('/onboarding-esign-bridge-2026-08-28.js')]);if(cfg.includes('esign-agreements-2026-08-28.js?v=2026.08.28.004')&&cfg.includes('onboarding-esign-bridge-2026-08-28.js?v=2026.08.28.004')&&e.includes("VERSION='2026.08.28.004'")&&b.includes("VERSION='2026.08.28.004'"))return;}catch{}await sleep(5000)}throw new Error('Production E-Sign .004 did not become live in time');}
async function publicAudit(browser,viewport,label,mobile=false){
  const page=await browser.newPage({viewport,isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const r=await page.goto(`${BASE}/?esigncert=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});rec(`${label}: homepage loads`,!!r&&r.ok(),r?`HTTP ${r.status()}`:'no response');
  await page.waitForFunction(()=>window.ALLSHIELD_ESIGN_VERSION==='2026.08.28.004'&&window.ALLSHIELD_ONBOARDING_ESIGN_BRIDGE_VERSION==='2026.08.28.004',{timeout:30000});
  const runtime=await page.evaluate(()=>({esign:window.ALLSHIELD_ESIGN_VERSION,bridge:window.ALLSHIELD_ONBOARDING_ESIGN_BRIDGE_VERSION,agentDocs:[...document.querySelectorAll('#agentPortal .sidebar .side-link')].some(x=>/Documents\s*&\s*E-Sign/i.test(x.textContent||'')),adminDocs:[...document.querySelectorAll('#adminPortal .sidebar .side-link')].some(x=>/Documents\s*&\s*E-Sign/i.test(x.textContent||'')),ownerSig:[...document.querySelectorAll('#ownerPortal .sidebar .side-link')].some(x=>/Signature\s*&\s*Agreements/i.test(x.textContent||'')),modal:!!document.querySelector('#asEsignModal')}));
  rec(`${label}: E-Sign runtime .004 active`,runtime.esign==='2026.08.28.004',JSON.stringify(runtime));
  rec(`${label}: onboarding E-Sign bridge .004 active`,runtime.bridge==='2026.08.28.004',JSON.stringify(runtime));
  rec(`${label}: Agent Documents & E-Sign route exists`,runtime.agentDocs,JSON.stringify(runtime));
  rec(`${label}: Admin Documents & E-Sign route exists`,runtime.adminDocs,JSON.stringify(runtime));
  rec(`${label}: Owner Signature & Agreements route exists`,runtime.ownerSig,JSON.stringify(runtime));
  rec(`${label}: secure E-Sign modal runtime exists`,runtime.modal,JSON.stringify(runtime));
  if(mobile){
    await page.waitForSelector('.mobile-public-topnav',{timeout:15000});
    await page.locator('.mobile-public-topnav [data-mobile-public="coverage"]').tap({timeout:5000});rec('Mobile: Coverage tab works',true,'tap completed');
    await page.locator('.mobile-public-topnav [data-mobile-public="careers"]').tap({timeout:5000});await page.waitForSelector('#careersPage.show',{timeout:5000});rec('Mobile: Careers tab works',true,'opened');
    await page.evaluate(()=>window.returnHome?.());await page.waitForSelector('.mobile-public-topnav',{state:'visible',timeout:5000});
    await page.locator('.mobile-public-topnav [data-mobile-public="portal"]').tap({timeout:5000});await page.waitForSelector('#portalChooser.show',{timeout:5000});rec('Mobile: Team Portal tab works',true,'chooser open');
    const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));rec('Mobile: no horizontal overflow',layout.scroll<=layout.width+2,JSON.stringify(layout));
  }else{
    await page.locator('.shell .nav-links a[href="#coverage"]').click({timeout:5000});rec('Desktop: Coverage navigation works',(await page.evaluate(()=>location.hash))==='#coverage','hash='+await page.evaluate(()=>location.hash));
    const careers=page.locator('.shell .nav-links a').filter({hasText:'Careers'}).first();await careers.click({timeout:5000});await page.waitForSelector('#careersPage.show',{timeout:5000});rec('Desktop: Careers navigation works',true,'opened');
    await page.evaluate(()=>window.returnHome?.());await page.waitForSelector('.shell',{state:'visible',timeout:5000});const portal=page.locator('.shell button').filter({hasText:'Team Portal'}).first();await portal.click({timeout:5000});await page.waitForSelector('#portalChooser.show',{timeout:5000});rec('Desktop: Team Portal works',true,'chooser open');
  }
  rec(`${label}: no browser page errors`,errors.length===0,errors.join(' | ')||'none');await page.close();
}
let browser;
try{
  await waitDeploy();rec('Production E-Sign release deployed',true,'.004 config + runtime + onboarding bridge live');
  const cfg=await text('/config.js');rec('Config loads E-Sign after onboarding router',cfg.indexOf('allshieldEsignAgreementsLoader')>cfg.indexOf('allshieldOnboardingRouterLoader'),'loader order verified');
  const es=await text('/esign-agreements-2026-08-28.js');
  rec('Agent signature is drawn, not uploaded',es.includes('asAgentSignatureCanvas')&&!/type=["\']file["\']/i.test(es),'canvas present; no file input');
  rec('Owner countersign requires explicit authorization',es.includes('asOwnerAuthorizeCounter')&&es.includes('authorize:true'),'explicit checkbox + server request');
  rec('Signed-record audit UI exposes SHA-256',es.includes('document_body_sha256')&&es.includes('Audit record'),'hash audit present');
  browser=await chromium.launch({headless:true,channel:'chrome'});
  await publicAudit(browser,{width:1440,height:1000},'Desktop',false);
  await publicAudit(browser,{width:390,height:844},'Mobile',true);
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);console.log(JSON.stringify({certification:'ALLSHIELD Production E-Sign + Navigation',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)},null,2));process.exitCode=failures.length?1:0;
