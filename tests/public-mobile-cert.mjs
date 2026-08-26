import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const failures=[];const rec=(name,ok,detail='')=>{checks.push({name,ok,detail});if(!ok)failures.push(`${name}: ${detail}`)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitDeploy(){for(let i=0;i<36;i++){try{const r=await fetch(`${BASE}/?mobilecert=${Date.now()}`,{cache:'no-store'});const t=await r.text();if(r.ok&&t.includes('responsive.css?v=2026.08.26.005')&&t.includes('responsive-ui.js?v=2026.08.26.005'))return;}catch{}await sleep(10000);}throw new Error('Mobile logo/login release did not become live in time.');}
let browser;
try{
  await waitDeploy();
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const r=await page.goto(BASE,{waitUntil:'networkidle',timeout:60000});
  rec('Mobile homepage HTTP',!!r&&r.ok(),r?`HTTP ${r.status()}`:'no response');
  const m=await page.evaluate(()=>{
    const box=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();const cs=getComputedStyle(e);return {left:b.left,right:b.right,width:b.width,height:b.height,font:parseFloat(cs.fontSize)||0,color:cs.color,display:cs.display}};
    const buttons=[...document.querySelectorAll('nav .nav-links .btn')].map(e=>{const b=e.getBoundingClientRect();return {text:e.textContent.trim(),primary:e.classList.contains('btn-primary'),left:b.left,right:b.right,width:b.width,color:getComputedStyle(e).color}});
    return {innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:box('.hero h1'),logoStage:box('.hero .logo-stage'),cta:box('.cta .btn-primary'),heroButton:box('.hero .btn-primary'),buttons};
  });
  rec('No horizontal overflow',m.scrollWidth<=m.innerWidth+2,`scrollWidth=${m.scrollWidth}; innerWidth=${m.innerWidth}`);
  rec('Mobile header controls fit',m.buttons.length>=2&&m.buttons.every(b=>b.left>=0&&b.right<=m.innerWidth+1),JSON.stringify(m.buttons));
  rec('Mobile hero scale',!!m.h1&&m.h1.width<=m.innerWidth-20&&m.h1.font<=47,JSON.stringify(m.h1));
  rec('Duplicate hero logo removed on phone',m.logoStage?.display==='none'||m.logoStage?.height===0,JSON.stringify(m.logoStage));
  const primaryNav=m.buttons.filter(b=>b.primary);
  rec('Primary button contrast',primaryNav.length>0&&primaryNav.every(b=>/rgb\(255, 255, 255\)/.test(b.color))&&/rgb\(255, 255, 255\)/.test(m.heroButton?.color||'')&&/rgb\(255, 255, 255\)/.test(m.cta?.color||''),`primaryNav=${primaryNav.map(b=>b.color).join(',')}; hero=${m.heroButton?.color}; cta=${m.cta?.color}`);
  rec('CTA fits mobile viewport',!!m.cta&&m.cta.left>=0&&m.cta.right<=m.innerWidth+1,JSON.stringify(m.cta));

  await page.locator('nav .login').click();
  await page.waitForSelector('#portalChooser.show',{timeout:5000});
  await page.locator('#portalChooser .portal-choice').filter({hasText:'Owner Portal'}).click();
  await page.waitForSelector('#ownerLogin.show',{timeout:5000});
  const loginMetrics=await page.evaluate(()=>{const card=document.querySelector('#ownerLogin .login-card');const u=document.querySelector('#ownerLogin input:not([type]),#ownerLogin input[type="text"],#ownerLogin input[type="email"]');const p=document.querySelector('#ownerLogin input[type="password"]');const b=card?.getBoundingClientRect();return {card:b?{left:b.left,right:b.right,width:b.width,top:b.top,bottom:b.bottom}:null,userAutocomplete:u?.autocomplete,userAutocapitalize:u?.getAttribute('autocapitalize'),passAutocomplete:p?.autocomplete};});
  rec('Owner login card fits phone',!!loginMetrics.card&&loginMetrics.card.left>=0&&loginMetrics.card.right<=390&&loginMetrics.card.top>=0,JSON.stringify(loginMetrics));
  rec('Owner login mobile input settings',loginMetrics.userAutocomplete==='username'&&loginMetrics.userAutocapitalize==='none'&&loginMetrics.passAutocomplete==='current-password',JSON.stringify(loginMetrics));
  await page.evaluate(()=>{window.__mobileOwnerLoginInvoked=null;window.productionLogin=async role=>{window.__mobileOwnerLoginInvoked=role;};});
  await page.fill('#ownerLogin input:not([type]), #ownerLogin input[type="text"], #ownerLogin input[type="email"]','owner');
  await page.fill('#ownerLogin input[type="password"]','test-password');
  await page.locator('#ownerLogin button.btn-primary').click();
  await page.waitForTimeout(100);
  const invoked=await page.evaluate(()=>window.__mobileOwnerLoginInvoked);
  rec('Owner login button invokes secure login path',invoked==='owner',`invoked=${invoked}`);
  await page.fill('#ownerLogin input[type="password"]','test-password');
  await page.locator('#ownerLogin input[type="password"]').press('Enter');
  await page.waitForTimeout(100);
  const enterInvoked=await page.evaluate(()=>window.__mobileOwnerLoginInvoked);
  rec('Owner login Enter key works on mobile',enterInvoked==='owner',`invoked=${enterInvoked}`);

  rec('Mobile browser errors',errs.length===0,errs.join(' | ')||'none');
  await page.screenshot({path:'certification/public-mobile-home.png',fullPage:true});
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const result={certification:'ALLSHIELD public mobile homepage + Owner login certification',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.filter(x=>x.ok).length,total:checks.length,checks,failures};
console.log(JSON.stringify(result,null,2));process.exitCode=failures.length?1:0;
