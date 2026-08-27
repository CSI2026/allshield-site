// Re-run marker: config loader is now cache-busted in index.html.
import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const failures=[];const rec=(name,ok,detail='')=>{checks.push({name,ok,detail});if(!ok)failures.push(`${name}: ${detail}`)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitDeploy(){for(let i=0;i<72;i++){try{const r=await fetch(`${BASE}/config.js?cert=${Date.now()}`,{cache:'no-store'});const t=await r.text();if(r.ok&&t.includes('careers-video-experience-fix-2026-08-27.js?v=2026.08.27.007'))return;}catch{}await sleep(5000);}throw new Error('Careers video experience .007 did not become live in time.');}
let browser;
try{
  await waitDeploy();rec('Careers video experience runtime deployed',true,'v2026.08.27.007 is live');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
  rec('Homepage HTTP',!!response&&response.ok(),response?`HTTP ${response.status()}`:'no response');
  await page.waitForFunction(()=>window.ALLSHIELD_CAREERS_VIDEO_EXPERIENCE_VERSION==='2026.08.27.007',{timeout:30000});
  const home=await page.evaluate(()=>({
    heroActions:[...document.querySelectorAll('.shell .hero .actions button,.shell .hero .actions a')].map(x=>(x.textContent||'').trim()),
    careersTop:[...document.querySelectorAll('.shell .nav-links a')].some(x=>(x.textContent||'').trim()==='Careers'),
    url:location.href
  }));
  rec('Homepage customer CTA stays customer-only',home.heroActions.includes('Explore Coverage')&&!home.heroActions.some(x=>/join our team|join the team/i.test(x)),JSON.stringify(home.heroActions));
  rec('Careers remains in top navigation',home.careersTop,'top Careers navigation present');
  rec('Homepage keeps clean domain',home.url===`${BASE}/`,`url=${home.url}`);

  await page.evaluate(()=>window.openCareersPage());
  await page.waitForSelector('#careersPage.show .career-sizzle-placeholder.career-sizzle-top',{timeout:15000});
  await page.waitForTimeout(3500);
  const state=await page.evaluate(async()=>{
    const canvas=document.querySelector('#careersPage .career-canvas');const s=document.querySelector('#careersPage .career-sizzle-placeholder');const hero=document.querySelector('#careersPage .career-hero-screen');const btn=s?.querySelector('.career-sizzle-final-button');
    const c=window.ALLSHIELD_CONFIG;let cfg={};try{const r=await fetch(`${c.SUPABASE_URL}/functions/v1/career-sizzle-config?cert=${Date.now()}`,{headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY},cache:'no-store'});cfg=await r.json()}catch(e){cfg={fetchError:String(e)}}
    return {first:canvas?.firstElementChild===s,sizzleTop:s?.getBoundingClientRect().top,heroTop:hero?.getBoundingClientRect().top,headline:s?.querySelector('h2')?.textContent||'',buttonText:btn?.innerText||'',buttonCount:btn?1:0,frameText:s?.querySelector('.career-sizzle-frame')?.innerText||'',cfg};
  });
  rec('Sizzle is first section on Careers page',state.first,JSON.stringify({first:state.first,sizzleTop:state.sizzleTop,heroTop:state.heroTop}));
  rec('Sizzle visually appears before Careers hero',Number(state.sizzleTop)<Number(state.heroTop),`sizzleTop=${state.sizzleTop}; heroTop=${state.heroTop}`);
  rec('Sizzle top copy is upgraded',/built differently/i.test(state.headline),state.headline);
  rec('Browser TTS disabled at backend',state.cfg?.voice_enabled===false,`voice_enabled=${state.cfg?.voice_enabled}; mode=${state.cfg?.player_mode}; scenes=${state.cfg?.preview_scenes?.length}`);
  rec('Careers sizzle remains playable',state.buttonCount===1,`buttonCount=${state.buttonCount}; frame=${state.frameText.slice(0,250).replace(/\n/g,' | ')}; cfgMode=${state.cfg?.player_mode}; cfgError=${state.cfg?.error||state.cfg?.fetchError||'none'}`);
  if(state.buttonCount===1){
    rec('Robot narration is not advertised',!/Narrated/i.test(state.buttonText),state.buttonText.slice(0,220).replace(/\n/g,' | '));
    await page.locator('#careersPage .career-sizzle-final-button').click();
    await page.waitForSelector('#careerSizzlePlayer.open',{timeout:8000});
    const voiceDisplay=await page.locator('#careerSizzlePlayer [data-asz-voice]').evaluateAll(nodes=>nodes.length?getComputedStyle(nodes[0]).display:'missing');
    rec('Robot voice control removed/hidden',voiceDisplay==='none'||voiceDisplay==='missing',`voiceControl=${voiceDisplay}`);
    await page.locator('#careerSizzlePlayer [data-asz-close]').click();
  }
  rec('No browser page errors',errs.length===0,errs.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const out={certification:'ALLSHIELD Careers top sizzle + customer-only homepage + no browser robot narration',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.filter(x=>x.ok).length,total:checks.length,checks,failures};
console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
