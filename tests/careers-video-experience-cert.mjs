import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const VIDEO='https://github.com/CSI2026/allshield-site/releases/download/careers-sizzle-v1/allshield-careers-built-around-the-customer.mp4';
const checks=[];const failures=[];const rec=(name,ok,detail='')=>{checks.push({name,ok,detail});if(!ok)failures.push(`${name}: ${detail}`)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitDeploy(){for(let i=0;i<72;i++){try{const r=await fetch(`${BASE}/config.js?cert=${Date.now()}`,{cache:'no-store'});const t=await r.text();if(r.ok&&t.includes('careers-video-experience-fix-2026-08-27.js?v=2026.08.27.007'))return;}catch{}await sleep(5000);}throw new Error('Careers video experience .007 did not become live in time.');}
let browser;
try{
  await waitDeploy();rec('Careers video experience runtime deployed',true,'v2026.08.27.007 is live');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const response=await page.goto(`${BASE}/?cert=${Date.now()}`,{waitUntil:'commit',timeout:60000});
  rec('Homepage HTTP',!!response&&response.ok(),response?`HTTP ${response.status()}`:'no response');
  await page.waitForSelector('.shell',{timeout:45000});
  await page.waitForFunction(()=>typeof window.openCareersPage==='function',{timeout:120000,polling:500});
  await page.waitForTimeout(2500);
  const home=await page.evaluate(()=>({heroActions:[...document.querySelectorAll('.shell .hero .actions button,.shell .hero .actions a')].map(x=>(x.textContent||'').trim()),careersTop:[...document.querySelectorAll('.shell .nav-links a')].some(x=>(x.textContent||'').trim()==='Careers'),url:location.href}));
  rec('Homepage customer CTA stays customer-only',home.heroActions.includes('Explore Coverage')&&!home.heroActions.some(x=>/join our team|join the team/i.test(x)),JSON.stringify(home.heroActions));
  rec('Careers remains in top navigation',home.careersTop,'top Careers navigation present');
  rec('Homepage keeps clean domain',home.url===`${BASE}/`,`url=${home.url}`);
  await page.evaluate(()=>window.openCareersPage());
  await page.waitForSelector('#careersPage.show',{timeout:30000});
  await page.waitForSelector('#careersPage .career-sizzle-placeholder',{timeout:45000});
  await page.waitForFunction(()=>document.querySelector('#careersPage .career-canvas')?.firstElementChild?.classList.contains('career-sizzle-placeholder')===true,{timeout:90000,polling:500});
  await page.waitForSelector('#careersPage .career-sizzle-frame video',{timeout:90000});
  const state=await page.evaluate(async VIDEO=>{
    const canvas=document.querySelector('#careersPage .career-canvas'),s=document.querySelector('#careersPage .career-sizzle-placeholder'),hero=document.querySelector('#careersPage .career-hero-screen'),video=s?.querySelector('video');
    const c=window.ALLSHIELD_CONFIG;let cfg={};try{const r=await fetch(`${c.SUPABASE_URL}/functions/v1/career-sizzle-config?cert=${Date.now()}`,{headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY},cache:'no-store'});cfg=await r.json()}catch(e){cfg={fetchError:String(e)}}
    return {first:canvas?.firstElementChild===s,sizzleTop:s?.getBoundingClientRect().top,heroTop:hero?.getBoundingClientRect().top,headline:s?.querySelector('h2')?.textContent||'',videoSrc:video?.getAttribute('src')||'',controls:!!video?.controls,buttonCount:s?.querySelectorAll('.career-sizzle-final-button').length||0,cfg};
  },VIDEO);
  rec('Video is first section on Careers page',state.first,JSON.stringify({first:state.first,sizzleTop:state.sizzleTop,heroTop:state.heroTop}));
  rec('Video visually appears before Careers hero',Number(state.sizzleTop)<Number(state.heroTop),`sizzleTop=${state.sizzleTop}; heroTop=${state.heroTop}`);
  rec('Careers top copy remains premium',/built differently/i.test(state.headline),state.headline);
  rec('Approved professional video is live',state.videoSrc===VIDEO&&state.controls===true,`src=${state.videoSrc}; controls=${state.controls}`);
  rec('Backend reports final video mode',state.cfg?.player_mode==='video'&&state.cfg?.video_url===VIDEO&&state.cfg?.status==='published',JSON.stringify({mode:state.cfg?.player_mode,status:state.cfg?.status,video_url:state.cfg?.video_url}));
  rec('Browser TTS stays disabled',state.cfg?.voice_enabled===false,`voice_enabled=${state.cfg?.voice_enabled}`);
  rec('Old interactive preview is removed',state.buttonCount===0,`buttonCount=${state.buttonCount}`);
  const mobile=await page.locator('#careersPage .career-sizzle-frame video').evaluate(v=>({width:v.getBoundingClientRect().width,height:v.getBoundingClientRect().height,controls:v.controls}));
  rec('Video fits mobile Careers layout',mobile.width>300&&mobile.width<=390&&mobile.height>150,JSON.stringify(mobile));
  rec('No browser page errors',errs.length===0,errs.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const out={certification:'ALLSHIELD final professional Careers video + mobile layout certification',base_url:BASE,video_url:VIDEO,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.filter(x=>x.ok).length,total:checks.length,checks,failures};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
