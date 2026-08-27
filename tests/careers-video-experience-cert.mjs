const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const VIDEO='https://allshieldinsurancegroup.com/assets/video/allshield-careers-built-around-the-customer.mp4';
const checks=[];const failures=[];const rec=(name,ok,detail='')=>{checks.push({name,ok,detail});if(!ok)failures.push(`${name}: ${detail}`)};
try{
  const [home,cfgText,careerText,routeText]=await Promise.all([
    fetch(`${BASE}/?cert=${Date.now()}`,{redirect:'follow',cache:'no-store'}),
    fetch(`${BASE}/config.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text()),
    fetch(`${BASE}/careers-video-experience-fix-2026-08-27.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text()),
    fetch(`${BASE}/video-sizzle-routing-2026-08-27.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text())
  ]);
  const homeText=await home.text();
  rec('Homepage HTTP',home.ok,`HTTP ${home.status}`);
  rec('Careers runtime deployed',cfgText.includes('careers-video-experience-fix-2026-08-27.js?v=2026.08.27.007'),'Careers .007 loader present');
  rec('Homepage has customer coverage CTA',/Explore Coverage/i.test(homeText),'Explore Coverage present in production HTML');
  rec('Careers remains in navigation',/Careers/i.test(homeText),'Careers text present in production HTML');
  rec('Home Join Our Team suppression is deployed',careerText.includes('removeHomeRecruitingCTA')&&careerText.includes("t==='join our team'"),'recruiting CTA removal logic present');
  rec('Careers sizzle is forced to top',careerText.includes('moveSizzleToTop')&&careerText.includes("canvas.insertBefore(sizzle,canvas.firstElementChild)"),'top placement logic present');
  rec('Robot browser narration is disabled',careerText.includes('speechSynthesis.cancel')&&careerText.includes('[data-asz-voice]'),'browser TTS removal logic present');
  rec('Professional video route uses native player',routeText.includes('if(cfg.video_url)')&&routeText.includes('<video controls playsinline'),'native HTML5 video route present');

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
const out={certification:'ALLSHIELD final Careers layout + professional first-party video configuration',base_url:BASE,video_url:VIDEO,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.filter(x=>x.ok).length,total:checks.length,checks,failures};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
