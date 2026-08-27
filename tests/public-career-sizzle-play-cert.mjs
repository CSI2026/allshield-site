import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function live(path){const r=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}cert=${Date.now()}`,{redirect:'follow',cache:'no-store'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return await r.text();}
async function waitDeploy(){for(let i=0;i<60;i++){try{const [cfg,route]=await Promise.all([live('/config.js'),live('/video-sizzle-routing-2026-08-27.js')]);if(cfg.includes('video-sizzle-routing-2026-08-27.js?v=2026.08.27.005')&&route.includes("VERSION='2026.08.27.005'")&&route.includes('careerSizzlePlayer'))return;}catch{}await sleep(5000)}throw new Error('Final narrated Careers sizzle did not become live in time.');}
let browser;
try{
  await waitDeploy();rec('Final sizzle runtime deployed',true,'routing v2026.08.27.005 is live');
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const response=await page.goto(`${BASE}/?v=2026.08.27.005`,{waitUntil:'domcontentloaded',timeout:60000});rec('Public site navigation',!!response&&response.ok(),response?`HTTP ${response.status()}`:'no response');
  await page.waitForFunction(()=>typeof window.openCareersPage==='function',{timeout:30000});await page.evaluate(()=>window.openCareersPage());
  await page.waitForSelector('.career-sizzle-placeholder',{timeout:15000});await page.waitForSelector('.career-sizzle-final-button',{timeout:15000});
  const buttonText=await page.locator('.career-sizzle-final-button').innerText(),buttonLower=buttonText.toLowerCase();rec('Careers card is final playable experience',buttonLower.includes('live 3-minute experience')&&buttonLower.includes('narrated')&&buttonLower.includes('15 scenes'),buttonText.slice(0,220).replace(/\n/g,' | '));
  await page.locator('.career-sizzle-final-button').click();await page.waitForSelector('#careerSizzlePlayer.open',{timeout:8000});
  const first=await page.locator('#careerSizzlePlayer .asz-scene-label').innerText();const headline=await page.locator('#careerSizzlePlayer .asz-headline').innerText();rec('Play opens final sizzle',first.toLowerCase().includes('scene 1 of 15')&&headline.length>10,`${first} | ${headline}`);
  const controls=await page.locator('#careerSizzlePlayer [data-asz-voice],#careerSizzlePlayer [data-asz-music],#careerSizzlePlayer [data-asz-captions]').count();rec('Voice music and caption controls are installed',controls===3,`controls=${controls}`);
  await page.waitForTimeout(1400);const progress=await page.locator('#careerSizzlePlayer .asz-progress').evaluate(el=>parseFloat(el.style.width||'0'));rec('Sizzle timeline actually advances',progress>0,`progress=${progress.toFixed(2)}%`);
  await page.locator('[data-asz-next]').click();const second=await page.locator('#careerSizzlePlayer .asz-scene-label').innerText();rec('Scene controls work',second.toLowerCase().includes('scene 2 of 15'),second);
  const visualText=await page.locator('#careerSizzlePlayer .asz-visual').innerText();rec('Scene-specific visual content renders',visualText.trim().length>20,visualText.trim().slice(0,120).replace(/\n/g,' | '));
  await page.locator('[data-asz-close]').click();const closed=await page.locator('#careerSizzlePlayer').evaluate(el=>!el.classList.contains('open'));rec('Sizzle closes correctly',closed,'player closed');
  rec('No public browser page errors',errs.length===0,errs.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);const out={certification:'ALLSHIELD final narrated Careers opportunity sizzle certification',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
