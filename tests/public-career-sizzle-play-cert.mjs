import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const VIDEO='https://github.com/CSI2026/allshield-site/releases/download/careers-sizzle-v1/allshield-careers-built-around-the-customer.mp4';
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function live(path){const r=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}cert=${Date.now()}`,{redirect:'follow',cache:'no-store'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return await r.text();}
async function waitDeploy(){for(let i=0;i<72;i++){try{const cfg=await live('/config.js');if(cfg.includes('careers-video-experience-fix-2026-08-27.js?v=2026.08.27.007'))return;}catch{}await sleep(5000)}throw new Error('Careers video runtime did not become live in time.');}
let browser;
try{
  await waitDeploy();rec('Careers runtime deployed',true,'v2026.08.27.007 is live');
  const head=await fetch(VIDEO,{method:'HEAD',redirect:'follow'});rec('Permanent professional video asset reachable',head.ok,`HTTP ${head.status}; type=${head.headers.get('content-type')||'unknown'}; length=${head.headers.get('content-length')||'unknown'}`);
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const response=await page.goto(`${BASE}/?cert=${Date.now()}`,{waitUntil:'commit',timeout:60000});rec('Public site navigation',!!response&&response.ok(),response?`HTTP ${response.status()}`:'no response');
  await page.waitForSelector('.shell',{timeout:45000});
  await page.waitForFunction(()=>typeof window.openCareersPage==='function',{timeout:120000,polling:500});
  await page.waitForTimeout(2500);
  await page.evaluate(()=>window.openCareersPage());
  await page.waitForSelector('#careersPage.show',{timeout:30000});
  await page.waitForSelector('#careersPage .career-sizzle-placeholder',{timeout:45000});
  await page.waitForFunction(()=>document.querySelector('#careersPage .career-canvas')?.firstElementChild?.classList.contains('career-sizzle-placeholder')===true,{timeout:90000,polling:500});
  await page.waitForSelector('#careersPage .career-sizzle-frame video',{timeout:90000});
  const src=await page.locator('#careersPage .career-sizzle-frame video').getAttribute('src');rec('Approved HeyGen master is wired to Careers',src===VIDEO,src||'missing src');
  const attrs=await page.locator('#careersPage .career-sizzle-frame video').evaluate(v=>({controls:v.controls,playsInline:v.playsInline,preload:v.preload}));rec('Professional video controls are enabled',attrs.controls===true,JSON.stringify(attrs));
  const meta=await page.locator('#careersPage .career-sizzle-frame video').evaluate(async v=>{
    v.muted=true;v.preload='auto';v.load();
    if(v.readyState<1) await Promise.race([new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',()=>reject(new Error(v.error?.message||'video error')),{once:true});}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('metadata timeout')),45000))]);
    return {readyState:v.readyState,duration:v.duration,error:v.error?{code:v.error.code,message:v.error.message}:null};
  });
  rec('Video metadata loads successfully',meta.readyState>=1&&!meta.error&&Number.isFinite(meta.duration),JSON.stringify(meta));
  rec('Correct approved video duration loaded',meta.duration>150&&meta.duration<165,`duration=${meta.duration}`);
  const playback=await page.locator('#careersPage .career-sizzle-frame video').evaluate(async v=>{v.muted=true;try{await v.play();}catch{}await new Promise(r=>setTimeout(r,2200));const out={currentTime:v.currentTime,paused:v.paused,ended:v.ended,error:v.error?{code:v.error.code,message:v.error.message}:null};v.pause();return out;});
  rec('Actual video playback starts',playback.currentTime>0&&!playback.error,JSON.stringify(playback));
  const fakeButton=await page.locator('#careersPage .career-sizzle-final-button').count();rec('Old interactive preview button is gone',fakeButton===0,`count=${fakeButton}`);
  rec('No public browser page errors',errs.length===0,errs.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);const out={certification:'ALLSHIELD approved professional Careers video certification',base_url:BASE,video_url:VIDEO,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
