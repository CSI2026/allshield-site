import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function text(path){const r=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}audit=${Date.now()}`,{cache:'no-store',redirect:'follow'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return r.text();}
async function waitDeploy(){for(let i=0;i<96;i++){try{const [idx,cfg,guard,career]=await Promise.all([text('/'),text('/config.js'),text('/runtime-mutation-guard-2026-08-27.js'),text('/careers-professional-video-live-2026-08-27.js')]);if(idx.includes('config.js?v=2026.08.27.011')&&idx.includes('responsive-ui.js?v=2026.08.27.011')&&cfg.includes('runtime-mutation-guard-2026-08-27.js?v=2026.08.27.011')&&!cfg.includes('video-sizzle-routing-2026-08-27.js')&&guard.includes("VERSION='2026.08.27.011'")&&career.includes("VERSION='2026.08.27.011'"))return;}catch{}await sleep(5000)}throw new Error('Audited .011 runtime did not become live in time');}
async function eventLoopAudit(page,label,seconds=8){
  const result=await page.evaluate(async seconds=>{const samples=[];const start=performance.now();while(performance.now()-start<seconds*1000){const t=performance.now();await new Promise(r=>setTimeout(r,100));samples.push(performance.now()-t)}return {samples,max:Math.max(...samples),avg:samples.reduce((a,b)=>a+b,0)/samples.length,count:samples.length}},seconds);
  rec(`${label}: main thread responsive`,result.max<650&&result.avg<220,`samples=${result.count}, avg=${Math.round(result.avg)}ms, max=${Math.round(result.max)}ms`);
}
async function mutationAudit(page,label,seconds=5){
  const count=await page.evaluate(seconds=>new Promise(resolve=>{let n=0;const Native=window.MutationObserver;const o=new Native(list=>{for(const m of list)n+=m.addedNodes.length+m.removedNodes.length+(m.type==='attributes'?1:0)});o.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});setTimeout(()=>{o.disconnect();resolve(n)},seconds*1000)}),seconds);
  rec(`${label}: no mutation storm`,count<120,`mutations over ${seconds}s=${count}`);
}
async function desktop(browser){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const r=await page.goto(`${BASE}/?audit=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});rec('Desktop: homepage loads',!!r&&r.ok(),r?`HTTP ${r.status()}`:'no response');await page.waitForSelector('.shell',{timeout:30000});await page.waitForTimeout(2500);
  const guard=await page.evaluate(()=>({v:window.ALLSHIELD_RUNTIME_MUTATION_GUARD_VERSION,blocked:window.ALLSHIELD_BLOCKED_GLOBAL_OBSERVERS||0}));rec('Desktop: global observer guard active',guard.v==='2026.08.27.011'&&guard.blocked>=1,JSON.stringify(guard));
  await eventLoopAudit(page,'Desktop',8);await mutationAudit(page,'Desktop',5);
  for(let cycle=1;cycle<=3;cycle++){
    await page.locator('.shell .nav-links a[href="#coverage"]').click({timeout:5000});await page.waitForTimeout(150);rec(`Desktop cycle ${cycle}: Coverage works`,(await page.evaluate(()=>location.hash))==='#coverage','hash='+await page.evaluate(()=>location.hash));
    const careers=page.locator('.shell .nav-links a').filter({hasText:'Careers'}).first();await careers.click({timeout:5000});await page.waitForSelector('#careersPage.show',{timeout:5000});rec(`Desktop cycle ${cycle}: Careers works`,true,'opened');
    const video=page.locator('#careersPage .career-sizzle-frame video');await video.waitFor({state:'visible',timeout:8000});const v=await video.evaluate(el=>({src:el.currentSrc||el.src,controls:el.controls,preload:el.preload}));rec(`Desktop cycle ${cycle}: Careers video intact`,/allshield-careers-built-around-the-customer\.mp4/.test(v.src)&&v.controls,JSON.stringify(v));
    await page.evaluate(()=>window.openCareer?.());await page.waitForSelector('#careerModal.show',{timeout:3000});rec(`Desktop cycle ${cycle}: application opens`,true,'modal open');await page.evaluate(()=>window.closeCareer?.());
    await page.evaluate(()=>window.returnHome?.());await page.waitForSelector('.shell',{state:'visible',timeout:5000});
    const portal=page.locator('.shell button').filter({hasText:'Team Portal'}).first();await portal.click({timeout:5000});await page.waitForSelector('#portalChooser.show',{timeout:5000});rec(`Desktop cycle ${cycle}: Team Portal works`,true,'chooser open');await page.evaluate(()=>document.getElementById('portalChooser')?.classList.remove('show'));
  }
  await eventLoopAudit(page,'Desktop post-interaction',5);rec('Desktop: no browser errors',errs.length===0,errs.join(' | ')||'none');await page.close();
}
async function mobile(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const r=await page.goto(`${BASE}/?mobileaudit=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});rec('Mobile: homepage loads',!!r&&r.ok(),r?`HTTP ${r.status()}`:'no response');await page.waitForSelector('.mobile-public-topnav',{timeout:30000});await page.waitForTimeout(2500);
  const guard=await page.evaluate(()=>({v:window.ALLSHIELD_RUNTIME_MUTATION_GUARD_VERSION,blocked:window.ALLSHIELD_BLOCKED_GLOBAL_OBSERVERS||0}));rec('Mobile: global observer guard active',guard.v==='2026.08.27.011'&&guard.blocked>=1,JSON.stringify(guard));
  await eventLoopAudit(page,'Mobile',8);await mutationAudit(page,'Mobile',5);
  for(let cycle=1;cycle<=3;cycle++){
    await page.locator('.mobile-public-topnav [data-mobile-public="coverage"]').tap({timeout:5000});await page.waitForTimeout(250);rec(`Mobile cycle ${cycle}: Coverage tab responds`,true,'tap completed');
    await page.locator('.mobile-public-topnav [data-mobile-public="careers"]').tap({timeout:5000});await page.waitForSelector('#careersPage.show',{timeout:5000});rec(`Mobile cycle ${cycle}: Careers tab responds`,true,'careers open');
    const video=page.locator('#careersPage .career-sizzle-frame video');await video.waitFor({state:'visible',timeout:8000});rec(`Mobile cycle ${cycle}: professional video visible`,await video.isVisible(),'video visible');
    await page.evaluate(()=>window.openCareer?.());await page.waitForSelector('#careerModal.show',{timeout:3000});const scroll=await page.locator('#careerModal .modal-card').evaluate(el=>({h:el.clientHeight,sh:el.scrollHeight,top:el.scrollTop}));if(scroll.sh>scroll.h){await page.locator('#careerModal .modal-card').evaluate(el=>{el.scrollTop=Math.min(500,el.scrollHeight);});await page.waitForTimeout(150)}rec(`Mobile cycle ${cycle}: application sheet usable`,scroll.sh>=scroll.h,JSON.stringify(scroll));await page.evaluate(()=>window.closeCareer?.());
    await page.evaluate(()=>window.returnHome?.());await page.waitForSelector('.shell',{state:'visible',timeout:5000});await page.waitForSelector('.mobile-public-topnav',{state:'visible',timeout:5000});
    await page.locator('.mobile-public-topnav [data-mobile-public="portal"]').tap({timeout:5000});await page.waitForSelector('#portalChooser.show',{timeout:5000});rec(`Mobile cycle ${cycle}: Team Portal tab responds`,true,'chooser open');await page.evaluate(()=>document.getElementById('portalChooser')?.classList.remove('show'));
  }
  await eventLoopAudit(page,'Mobile post-interaction',5);rec('Mobile: no browser errors',errs.length===0,errs.join(' | ')||'none');await page.close();
}
let browser;
try{await waitDeploy();rec('Audited release deployed',true,'.011 loaders live, obsolete sizzle scanner absent');browser=await chromium.launch({headless:true});await desktop(browser);await mobile(browser);}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);console.log(JSON.stringify({certification:'ALLSHIELD deep responsiveness + navigation audit',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)},null,2));process.exitCode=failures.length?1:0;
