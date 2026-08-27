import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function live(path){const r=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}certprobe=${Date.now()}`,{cache:'no-store',redirect:'follow'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return await r.text();}
async function waitDeploy(){for(let i=0;i<60;i++){try{const [cfg,patch]=await Promise.all([live('/config.js'),live('/mobile-career-domain-fix-2026-08-27.js')]);if(cfg.includes('mobile-career-domain-fix-2026-08-27.js?v=2026.08.27.006')&&patch.includes("VERSION='2026.08.27.006'"))return;}catch{}await sleep(5000)}throw new Error('Career scroll/domain fix did not become live in time.');}
let browser;
try{
  await waitDeploy();rec('Career/domain runtime deployed',true,'v2026.08.27.006 is live');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const r=await page.goto(`${BASE}/?v=2026.08.27.006&utm_source=certification`,{waitUntil:'networkidle',timeout:60000});
  rec('Homepage HTTP',!!r&&r.ok(),r?`HTTP ${r.status()}`:'no response');
  await page.waitForFunction(()=>window.ALLSHIELD_MOBILE_CAREER_DOMAIN_FIX_VERSION==='2026.08.27.006',{timeout:15000});
  await page.waitForTimeout(100);
  const cleanUrl=page.url();rec('Homepage address is clean domain',cleanUrl===`${BASE}/`,`url=${cleanUrl}`);
  const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');rec('Canonical homepage domain is clean',canonical==='https://allshieldinsurancegroup.com/',`canonical=${canonical}`);
  await page.waitForFunction(()=>typeof window.openCareersPage==='function'&&typeof window.openCareer==='function',{timeout:20000});
  await page.evaluate(()=>{window.openCareersPage();window.openCareer();});
  await page.waitForSelector('#careerModal.show',{timeout:8000});
  const metrics=await page.evaluate(()=>{const modal=document.getElementById('careerModal'),card=modal?.querySelector('.modal-card'),close=card?.querySelector('.close');if(!card)return null;const cs=getComputedStyle(card),b=card.getBoundingClientRect(),cb=close?.getBoundingClientRect();return {clientHeight:card.clientHeight,scrollHeight:card.scrollHeight,overflowY:cs.overflowY,touchAction:cs.touchAction,top:b.top,bottom:b.bottom,closeTop:cb?.top,closeBottom:cb?.bottom};});
  rec('Career application is a bounded scrollable sheet',!!metrics&&metrics.scrollHeight>metrics.clientHeight&&['auto','scroll'].includes(metrics.overflowY)&&metrics.top>=0&&metrics.bottom<=845,JSON.stringify(metrics));
  const moved=await page.evaluate(()=>{const c=document.querySelector('#careerModal .modal-card');c.scrollTop=0;const before=c.scrollTop;c.scrollBy(0,Math.max(350,c.clientHeight*.7));return new Promise(resolve=>requestAnimationFrame(()=>resolve({before,after:c.scrollTop,max:c.scrollHeight-c.clientHeight})));});
  rec('Career application scrolls downward',moved.after>0&&moved.max>0,JSON.stringify(moved));
  const sticky=await page.evaluate(()=>{const c=document.querySelector('#careerModal .modal-card'),x=c.querySelector('.close');c.scrollTop=c.scrollHeight;const cb=x.getBoundingClientRect(),mb=c.getBoundingClientRect();return {scrollTop:c.scrollTop,max:c.scrollHeight-c.clientHeight,closeTop:cb.top,modalTop:mb.top,closeVisible:cb.bottom>0&&cb.top<innerHeight};});
  rec('Close button stays available while scrolled',sticky.scrollTop>0&&sticky.closeVisible&&sticky.closeTop>=sticky.modalTop-2,JSON.stringify(sticky));
  const backUp=await page.evaluate(()=>{const c=document.querySelector('#careerModal .modal-card');c.scrollTo(0,0);return new Promise(resolve=>requestAnimationFrame(()=>resolve(c.scrollTop)));});
  rec('Career application scrolls back to top',backUp===0,`scrollTop=${backUp}`);
  await page.locator('#careerModal .close').click();await page.waitForTimeout(100);const closed=await page.locator('#careerModal').evaluate(el=>!el.classList.contains('show'));rec('Career application closes correctly',closed,'modal closed');
  rec('No browser page errors',errs.length===0,errs.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);const result={certification:'ALLSHIELD mobile career application scrolling + clean homepage domain',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)};console.log(JSON.stringify(result,null,2));process.exitCode=failures.length?1:0;
