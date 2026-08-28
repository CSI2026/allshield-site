import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  let html='';
  for(let i=0;i<50;i++){
    html=await fetch(`${BASE}/?mobilefix=${Date.now()}`,{cache:'no-store'}).then(r=>r.text());
    if(html.includes('recruiting-platform.js?v=2026.08.28.001')&&html.includes('mobile-symmetry-fix-2026-08-28.js?v=2026.08.28.001'))break;
    await sleep(2000);
  }
  rec('Production index loads Recruiting & Leads module',html.includes('recruiting-platform.js?v=2026.08.28.001'),'recruiting-platform wired before responsive UI');
  rec('Production index loads mobile symmetry release',html.includes('mobile-symmetry-fix-2026-08-28.js?v=2026.08.28.001'),'mobile symmetry .001');

  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(`${BASE}/?symmetrycert=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
  rec('Live mobile homepage loads',response?.ok()===true,`HTTP ${response?.status()}`);
  await page.waitForFunction(()=>window.ALLSHIELD_MOBILE_SYMMETRY_VERSION==='2026.08.28.001',{timeout:20000});
  await page.waitForFunction(()=>typeof window.loadRecruitingPipeline==='function',{timeout:20000});
  rec('Mobile symmetry runtime executes',await page.evaluate(()=>window.ALLSHIELD_MOBILE_SYMMETRY_VERSION==='2026.08.28.001'),'.001 active');
  rec('Recruiting pipeline runtime executes',await page.evaluate(()=>typeof window.loadRecruitingPipeline==='function'),'pipeline function active');

  const navState=await page.evaluate(()=>({
    owner:[...document.querySelectorAll('#ownerPortal .sidebar .side-link')].some(x=>/Recruiting\s*&\s*Leads/i.test(x.textContent||'')),
    admin:[...document.querySelectorAll('#adminPortal .sidebar .side-link')].some(x=>/Recruiting\s*&\s*Leads/i.test(x.textContent||'')),
    ownerMobile:(document.querySelector('#ownerPortal .mobile-app-menu')?.textContent||'').includes('Recruiting & Leads'),
    adminMobile:(document.querySelector('#adminPortal .mobile-app-menu')?.textContent||'').includes('Recruiting & Leads')
  }));
  rec('Owner Portal shows Recruiting & Leads',navState.owner,JSON.stringify(navState));
  rec('Admin Portal shows Recruiting & Leads',navState.admin,JSON.stringify(navState));
  rec('Owner mobile More menu includes Recruiting & Leads',navState.ownerMobile,JSON.stringify(navState));
  rec('Admin mobile More menu includes Recruiting & Leads',navState.adminMobile,JSON.stringify(navState));

  const align=await page.evaluate(()=>{
    const val=s=>{const e=document.querySelector(s);return e?getComputedStyle(e).textAlign:null};
    const centerError=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return Math.abs((r.left+r.width/2)-(innerWidth/2));};
    return {
      hero:val('.shell .hero h1'),lead:val('.shell .hero .lead'),section:val('.shell .section-title'),card:val('.shell .card p'),cta:val('.shell .cta p'),
      heroCenterError:centerError('.shell .hero h1'),viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth
    };
  });
  for(const [k,v] of Object.entries({hero:align.hero,lead:align.lead,section:align.section,card:align.card,cta:align.cta})) rec(`Mobile ${k} copy is centered`,v==='center',String(v));
  rec('Mobile hero follows the screen centerline',align.heroCenterError!==null&&align.heroCenterError<3,`center error ${align.heroCenterError}px`);
  rec('Mobile homepage has no horizontal overflow',align.scrollWidth<=align.viewport+2,`scrollWidth ${align.scrollWidth}, viewport ${align.viewport}`);

  await page.evaluate(()=>window.openCareersPage?.());
  await page.waitForFunction(()=>document.getElementById('careersPage')?.classList.contains('show'),{timeout:10000});
  const career=await page.evaluate(()=>{
    const val=s=>{const e=document.querySelector(s);return e?getComputedStyle(e).textAlign:null};
    return {
      hero:val('#careersPage .career-hero-copy h1'),copy:val('#careersPage .career-hero-copy p'),system:val('#careersPage .career-system-card p'),origin:val('#careersPage .career-origin-card p'),final:val('#careersPage .career-final-card p'),sizzle:val('#careersPage .career-sizzle-card h2')
    };
  });
  for(const [k,v] of Object.entries(career)) rec(`Careers mobile ${k} copy is centered`,v==='center',String(v));
  rec('No browser page errors',errors.length===0,errors.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);const out={certification:'ALLSHIELD Recruiting & Leads + mobile symmetry live certification',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
