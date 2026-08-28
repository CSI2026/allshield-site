import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitDeploy(){for(let i=0;i<72;i++){try{const [idx,cfg]=await Promise.all([fetch(`${BASE}/?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text()),fetch(`${BASE}/config.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text())]);if(idx.includes('config.js?v=2026.08.27.010')&&cfg.includes('careers-video-experience-fix-2026-08-27.js?v=2026.08.27.010')&&cfg.includes('careers-professional-video-live-2026-08-27.js?v=2026.08.27.010'))return;}catch{}await sleep(5000)}throw new Error('Responsive release .010 did not become live in time');}
let browser;
try{
  await waitDeploy();rec('Responsive release deployed',true,'index + config .010 live');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const r=await page.goto(`${BASE}/?cert=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});rec('Homepage loads',!!r&&r.ok(),r?`HTTP ${r.status()}`:'no response');
  await page.waitForSelector('.shell',{timeout:30000});await page.waitForTimeout(7000);

  const lag=await page.evaluate(()=>new Promise(resolve=>{const start=performance.now();setTimeout(()=>resolve(performance.now()-start),100)}));
  rec('Main thread remains responsive',lag<750,`100ms timer completed in ${Math.round(lag)}ms`);

  const mutationCount=await page.evaluate(()=>new Promise(resolve=>{let n=0;const o=new MutationObserver(list=>{for(const m of list)n+=m.addedNodes.length+m.removedNodes.length});o.observe(document.documentElement,{subtree:true,childList:true});setTimeout(()=>{o.disconnect();resolve(n)},2000)}));
  rec('No DOM mutation storm',mutationCount<250,`mutations over 2s=${mutationCount}`);

  const coverage=page.locator('.shell .nav-links a[href="#coverage"]');await coverage.click({timeout:5000});await page.waitForTimeout(150);rec('Coverage tab works',(await page.evaluate(()=>location.hash))==='#coverage','hash='+await page.evaluate(()=>location.hash));

  await page.evaluate(()=>history.replaceState(null,'',location.pathname));
  const careers=page.locator('.shell .nav-links a').filter({hasText:'Careers'}).first();await careers.click({timeout:5000});await page.waitForSelector('#careersPage.show',{timeout:5000});rec('Careers tab works',true,'careers page opened');
  await page.waitForSelector('#careersPage .career-sizzle-frame video',{timeout:15000});const v=await page.locator('#careersPage .career-sizzle-frame video').evaluate(el=>({src:el.getAttribute('src'),controls:el.controls}));rec('Professional Careers video remains live',/allshield-careers-built-around-the-customer\.mp4/.test(v.src||'')&&v.controls===true,JSON.stringify(v));

  const careerHandler=await page.evaluate(()=>typeof window.openCareer==='function');
  if(careerHandler){await page.evaluate(()=>window.openCareer());await page.waitForSelector('#careerModal.show',{timeout:5000});rec('Careers application control responds',true,'canonical career application modal opened');}else rec('Careers application control responds',false,'openCareer handler missing');
  await page.evaluate(()=>{if(typeof window.closeCareer==='function')window.closeCareer();if(typeof window.returnHome==='function')window.returnHome();});await page.waitForTimeout(250);
  if(!(await page.locator('.shell').isVisible())) await page.reload({waitUntil:'domcontentloaded'});

  const portal=page.locator('.shell button').filter({hasText:'Team Portal'}).first();await portal.click({timeout:5000});await page.waitForSelector('#portalChooser.show',{timeout:5000});rec('Team Portal tab works',true,'portal chooser opened');
  const owner=page.locator('#portalChooser button,#portalChooser .portal-choice').filter({hasText:/Owner/i}).first();if(await owner.count()){await owner.click({timeout:5000});await page.waitForTimeout(250);rec('Portal chooser buttons work',(await page.locator('#ownerLogin.show').count())>0||(await page.locator('#ownerPortal.show').count())>0,'owner destination opened');}else rec('Portal chooser buttons work',false,'owner option not found');

  rec('No browser page errors',errs.length===0,errs.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);console.log(JSON.stringify({certification:'ALLSHIELD live site responsiveness + tabs',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)},null,2));process.exitCode=failures.length?1:0;
