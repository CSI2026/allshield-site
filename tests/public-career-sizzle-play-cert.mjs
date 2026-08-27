import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function live(path){const r=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}cert=${Date.now()}`,{redirect:'follow',cache:'no-store'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return await r.text();}
async function waitDeploy(){for(let i=0;i<48;i++){try{const [cfg,route]=await Promise.all([live('/config.js'),live('/video-sizzle-routing-2026-08-27.js')]);if(cfg.includes('video-sizzle-routing-2026-08-27.js?v=2026.08.27.002')&&route.includes("VERSION='2026.08.27.002'")&&route.includes('careerSizzlePreviewModal'))return;}catch{}await sleep(5000)}throw new Error('Functional public Careers sizzle player did not become live in time.');}
let browser;
try{
  await waitDeploy();rec('Functional sizzle runtime deployed',true,'routing v2026.08.27.002 is live');
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const response=await page.goto(`${BASE}/?v=2026.08.27.004`,{waitUntil:'domcontentloaded',timeout:60000});rec('Public site navigation',!!response&&response.ok(),response?`HTTP ${response.status()}`:'no response');
  await page.waitForFunction(()=>typeof window.openCareersPage==='function',{timeout:30000});await page.evaluate(()=>window.openCareersPage());
  await page.waitForSelector('.career-sizzle-placeholder',{timeout:15000});await page.waitForSelector('.career-sizzle-preview-button',{timeout:15000});
  const buttonText=await page.locator('.career-sizzle-preview-button').innerText();rec('Play control is interactive',buttonText.includes('Press Play')||buttonText.includes('production preview ready'),buttonText.slice(0,180).replace(/\n/g,' | '));
  await page.locator('.career-sizzle-preview-button').click();await page.waitForSelector('#careerSizzlePreviewModal.open',{timeout:8000});
  const first=await page.locator('#careerSizzlePreviewModal .csp-scene-no').innerText();rec('Play opens preview player',first.includes('Scene 1 of 15'),first);
  await page.waitForTimeout(1400);const progress=await page.locator('#careerSizzlePreviewModal .csp-progress').evaluate(el=>parseFloat(el.style.width||'0'));rec('Preview actually advances',progress>0,`progress=${progress.toFixed(2)}%`);
  await page.locator('[data-csp-play]').click();await page.locator('[data-csp-next]').click();const second=await page.locator('#careerSizzlePreviewModal .csp-scene-no').innerText();rec('Preview controls work',second.includes('Scene 2 of 15'),second);
  await page.locator('#careerSizzlePreviewModal .csp-close').click();const closed=await page.locator('#careerSizzlePreviewModal').evaluate(el=>!el.classList.contains('open'));rec('Preview closes correctly',closed,'modal closed');
  rec('No public browser page errors',errs.length===0,errs.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);const out={certification:'ALLSHIELD public Careers sizzle Play-button certification',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
