import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const VIDEO='https://allshieldinsurancegroup.com/assets/video/allshield-careers-built-around-the-customer.mp4';
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});
let browser;
try{
  const [home,cfgText,careerText,proText,guardText]=await Promise.all([
    fetch(`${BASE}/?cert=${Date.now()}`,{redirect:'follow',cache:'no-store'}),
    fetch(`${BASE}/config.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text()),
    fetch(`${BASE}/careers-video-experience-fix-2026-08-27.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text()),
    fetch(`${BASE}/careers-professional-video-live-2026-08-27.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text()),
    fetch(`${BASE}/runtime-mutation-guard-2026-08-27.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text())
  ]);
  rec('Public homepage reachable',home.ok,`HTTP ${home.status}`);
  rec('Audited Careers runtime is deployed',cfgText.includes('careers-video-experience-fix-2026-08-27.js?v=2026.08.27.010')&&cfgText.includes('careers-professional-video-live-2026-08-27.js?v=2026.08.27.011'),'config includes passive Careers .010 + professional video .011');
  rec('Obsolete sizzle scanner is removed',!cfgText.includes('video-sizzle-routing-2026-08-27.js'),'obsolete whole-page sizzle scanner not loaded');
  rec('Runtime mutation guard is deployed',cfgText.includes('runtime-mutation-guard-2026-08-27.js?v=2026.08.27.011')&&guardText.includes("VERSION='2026.08.27.011'"),'global mutation storm guard .011 present');
  rec('Homepage recruiting CTA removal remains deployed',careerText.includes('removeLegacyHomeJoinCTA')&&proText.includes('removeHomeRecruitingCTA'),'customer-only homepage cleanup remains present');
  rec('Professional video runtime directly mounts MP4',proText.includes(VIDEO)&&proText.includes("video.controls=true")&&proText.includes("video.playsInline=true"),'deterministic native HTML5 video integration present');

  const url=(cfgText.match(/SUPABASE_URL:\s*"([^"]+)"/)||[])[1];
  const key=(cfgText.match(/SUPABASE_PUBLISHABLE_KEY:\s*"([^"]+)"/)||[])[1];
  if(!url||!key) throw new Error('Could not read production Supabase configuration');
  const cr=await fetch(`${url}/functions/v1/career-sizzle-config?cert=${Date.now()}`,{headers:{apikey:key},cache:'no-store'});
  const c=await cr.json();
  rec('Careers backend config reachable',cr.ok&&c.ok===true,`HTTP ${cr.status}`);
  rec('Backend is in published professional video mode',c.status==='published'&&c.player_mode==='video'&&c.video_url===VIDEO,JSON.stringify({status:c.status,player_mode:c.player_mode,video_url:c.video_url}));
  rec('Browser robot narration stays disabled',c.voice_enabled===false,`voice_enabled=${c.voice_enabled}`);

  const range=await fetch(VIDEO,{headers:{Range:'bytes=0-1048575'},redirect:'follow'});
  const type=range.headers.get('content-type')||'';
  const bytes=await range.arrayBuffer();
  rec('Permanent approved MP4 is reachable',(range.ok||range.status===206)&&bytes.byteLength>10000,`HTTP ${range.status}; ${bytes.byteLength} bytes`);
  rec('Permanent asset is video/mp4',/video\/mp4/i.test(type),`content-type=${type}`);

  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.setContent(`<html><body style="margin:0;background:#050b14"><video id="v" controls playsinline preload="auto" style="width:100%;height:auto" src="${VIDEO}"></video></body></html>`,{waitUntil:'domcontentloaded'});
  const media=await page.locator('#v').evaluate(async v=>{
    v.muted=true;v.load();
    if(v.readyState<1) await Promise.race([new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',()=>reject(new Error(v.error?.message||'video error')),{once:true});}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('metadata timeout')),45000))]);
    let playError='';try{await v.play();}catch(e){playError=String(e)}
    await new Promise(r=>setTimeout(r,2200));
    const out={readyState:v.readyState,duration:v.duration,currentTime:v.currentTime,paused:v.paused,controls:v.controls,playError,error:v.error?{code:v.error.code,message:v.error.message}:null};v.pause();return out;
  });
  rec('Video metadata decodes in Google Chrome',media.readyState>=1&&Number.isFinite(media.duration)&&!media.error,JSON.stringify(media));
  rec('Approved video duration matches',media.duration>150&&media.duration<165,`duration=${media.duration}`);
  rec('Actual MP4 playback advances in Google Chrome',media.currentTime>0&&!media.error,JSON.stringify({currentTime:media.currentTime,paused:media.paused,playError:media.playError}));
  rec('Player controls are enabled',media.controls===true,'controls=true');
  rec('Media browser has no page errors',errs.length===0,errs.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);const out={certification:'ALLSHIELD final professional Careers video production integration certification',base_url:BASE,video_url:VIDEO,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
