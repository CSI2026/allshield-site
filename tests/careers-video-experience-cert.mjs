const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const VIDEO='https://allshieldinsurancegroup.com/assets/video/allshield-careers-built-around-the-customer.mp4';
const checks=[];const failures=[];const rec=(name,ok,detail='')=>{checks.push({name,ok,detail});if(!ok)failures.push(`${name}: ${detail}`)};
try{
  const [home,cfgText,experienceText,professionalText,routeText]=await Promise.all([
    fetch(`${BASE}/?cert=${Date.now()}`,{redirect:'follow',cache:'no-store'}),
    fetch(`${BASE}/config.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text()),
    fetch(`${BASE}/careers-video-experience-fix-2026-08-27.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text()),
    fetch(`${BASE}/careers-professional-video-live-2026-08-27.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text()),
    fetch(`${BASE}/video-sizzle-routing-2026-08-27.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text())
  ]);
  const homeText=await home.text();
  rec('Homepage HTTP',home.ok,`HTTP ${home.status}`);
  rec('Current Careers experience runtime deployed',cfgText.includes('careers-video-experience-fix-2026-08-27.js?v=2026.08.27.010'),'Careers experience .010 loader present');
  rec('Professional Careers video runtime deployed',cfgText.includes('careers-professional-video-live-2026-08-27.js?v=2026.08.27.012'),'Professional video .012 loader present');
  rec('Homepage has customer coverage CTA',/Explore Coverage/i.test(homeText),'Explore Coverage present in production HTML');
  rec('Careers remains in navigation',/Careers/i.test(homeText),'Careers text present in production HTML');
  rec('Home Join Our Team suppression is deployed',professionalText.includes('removeHomeRecruitingCTA')&&professionalText.includes('join our team|join the team'),'current recruiting CTA removal logic present');
  rec('Professional Careers video is forced to top',professionalText.includes('ensureVideo')&&professionalText.includes('canvas.insertBefore(sizzle,canvas.firstElementChild)'),'current top placement logic present');
  rec('Public professional video badge is removed',!professionalText.includes("badge.textContent='Professional opportunity video'")&&professionalText.includes("copy.querySelectorAll('.career-live-badge').forEach(el=>el.remove())"),'public badge creation removed and cleanup retained');
  rec('Robot browser narration is disabled',experienceText.includes('speechSynthesis.cancel')&&experienceText.includes('[data-asz-voice]'),'browser TTS removal logic present');
  rec('Professional video route uses native player',routeText.includes('if(cfg.video_url)')&&routeText.includes('<video controls playsinline'),'native HTML5 video route present');
  rec('Professional runtime installs native video element',professionalText.includes("document.createElement('video')")&&professionalText.includes("video.setAttribute('src',VIDEO_URL)"),'first-party HTML5 player installed');

  const url=(cfgText.match(/SUPABASE_URL:\s*"([^"]+)"/)||[])[1];
  const key=(cfgText.match(/SUPABASE_PUBLISHABLE_KEY:\s*"([^"]+)"/)||[])[1];
  if(!url||!key) throw new Error('Production Supabase config missing');
  const r=await fetch(`${url}/functions/v1/career-sizzle-config?cert=${Date.now()}`,{headers:{apikey:key},cache:'no-store'});const c=await r.json();
  rec('Careers backend config reachable',r.ok&&c.ok===true,`HTTP ${r.status}`);
  rec('Professional video is published',c.status==='published'&&c.player_mode==='video'&&c.video_url===VIDEO,JSON.stringify({status:c.status,mode:c.player_mode,url:c.video_url}));
  rec('Browser TTS remains off in backend',c.voice_enabled===false,`voice_enabled=${c.voice_enabled}`);
  const vr=await fetch(VIDEO,{headers:{Range:'bytes=0-1048575'},redirect:'follow'});const type=vr.headers.get('content-type')||'';const bytes=await vr.arrayBuffer();
  rec('First-party video asset reachable',(vr.ok||vr.status===206)&&bytes.byteLength>10000,`HTTP ${vr.status}; ${bytes.byteLength} bytes`);
  rec('First-party video served as video/mp4',/video\/mp4/i.test(type),`content-type=${type}`);
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}
const out={certification:'ALLSHIELD current Careers layout + professional first-party video configuration',base_url:BASE,video_url:VIDEO,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.filter(x=>x.ok).length,total:checks.length,checks,failures};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;