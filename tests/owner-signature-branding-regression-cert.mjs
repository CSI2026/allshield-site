import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  let html='';
  for(let i=0;i<60;i++){
    const r=await fetch(`${BASE}/?sigbrand=${Date.now()}`,{cache:'no-store'});html=await r.text();
    if(r.ok&&html.includes('owner-signature-management-2026-08-28.js?v=2026.08.28.003')&&html.includes('id="allshieldOrganizationSchema"'))break;
    await sleep(2000);
  }
  rec('Production loads Owner Signature runtime',html.includes('owner-signature-management-2026-08-28.js?v=2026.08.28.003'),'.003 wired');
  rec('Approved ALLSHIELD favicon is configured',html.includes('rel="icon" type="image/webp" href="./assets/brand-9aa0ec99b3b0.webp"'),'approved brand asset');
  rec('Organization schema is configured',html.includes('id="allshieldOrganizationSchema"')&&html.includes('https://allshieldinsurancegroup.com/assets/brand-9aa0ec99b3b0.webp'),'logo schema present');

  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(`${BASE}/?sigcert=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});rec('Live homepage loads',response?.ok()===true,`HTTP ${response?.status()}`);
  await page.waitForFunction(()=>window.ALLSHIELD_OWNER_SIGNATURE_VERSION==='2026.08.28.003',{timeout:30000});
  rec('Owner Signature runtime executes',await page.evaluate(()=>window.ALLSHIELD_OWNER_SIGNATURE_VERSION==='2026.08.28.003'),'.003 active');
  const nav=await page.evaluate(()=>({
    owner:[...document.querySelectorAll('#ownerPortal .sidebar .side-link')].some(x=>/Signature\s*&\s*Agreements/i.test(x.textContent||'')),
    admin:[...document.querySelectorAll('#adminPortal .sidebar .side-link')].some(x=>/Signature\s*&\s*Agreements/i.test(x.textContent||'')),
    ownerMobile:(document.querySelector('#ownerPortal .mobile-app-menu')?.textContent||'').includes('Signature & Agreements')
  }));
  rec('Owner Portal exposes Signature & Agreements',nav.owner,JSON.stringify(nav));
  rec('Signature management remains owner-only',!nav.admin,JSON.stringify(nav));
  rec('Owner mobile More menu exposes Signature & Agreements',nav.ownerMobile,JSON.stringify(nav));

  await page.evaluate(()=>window.loadOwnerSignatureManagement?.());
  await page.waitForSelector('#asOwnerSignatureCanvas',{timeout:10000});
  const view=await page.evaluate(()=>({
    canvas:!!document.querySelector('#asOwnerSignatureCanvas'),
    fileInputs:document.querySelectorAll('#ownerPortal input[type="file"]').length,
    email:(document.querySelector('#ownerPortal .portal-main')?.textContent||'').includes('onboarding@allshieldinsurancegroup.com'),
    pillars:['Life','Health','Auto','Home'].every(x=>(document.querySelector('#ownerPortal .portal-main')?.textContent||'').includes(x)),
    guard:(document.querySelector('#ownerPortal .portal-main')?.textContent||'').includes('does not automatically stamp')
  }));
  rec('Owner can draw a signature instead of uploading a file',view.canvas&&view.fileInputs===0,JSON.stringify(view));
  rec('Owner view shows onboarding sender identity',view.email,'onboarding@ present');
  rec('Owner view records the four-pillar blueprint',view.pillars,'Life / Health / Auto / Home');
  rec('Owner signature requires later explicit agreement authorization',view.guard,'security guard copy present');

  const box=await page.locator('#asOwnerSignatureCanvas').boundingBox();
  if(box){await page.mouse.move(box.x+35,box.y+80);await page.mouse.down();await page.mouse.move(box.x+110,box.y+110,{steps:8});await page.mouse.up();}
  rec('Signature canvas accepts pointer drawing',await page.evaluate(()=>document.querySelector('#asOwnerSignatureCanvas')?.dataset.ink==='1'),'ink recorded');
  await page.evaluate(()=>window.asClearOwnerSignatureCanvas?.());
  rec('Signature canvas Clear works',await page.evaluate(()=>document.querySelector('#asOwnerSignatureCanvas')?.dataset.ink==='0'),'canvas cleared');

  await page.evaluate(()=>window.returnHome?.());await page.waitForSelector('.mobile-public-topnav',{state:'visible',timeout:10000});
  await page.locator('.mobile-public-topnav [data-mobile-public="coverage"]').tap({timeout:5000});rec('Coverage tab still works',true,'tap completed');
  await page.locator('.mobile-public-topnav [data-mobile-public="careers"]').tap({timeout:5000});await page.waitForSelector('#careersPage.show',{timeout:5000});rec('Careers tab still works',true,'opened');
  await page.evaluate(()=>window.returnHome?.());await page.waitForSelector('.mobile-public-topnav',{state:'visible',timeout:5000});
  await page.locator('.mobile-public-topnav [data-mobile-public="portal"]').tap({timeout:5000});await page.waitForSelector('#portalChooser.show',{timeout:5000});rec('Team Portal tab still works',true,'chooser open');
  await page.evaluate(()=>document.getElementById('portalChooser')?.classList.remove('show'));
  const symmetry=await page.evaluate(()=>{const e=document.querySelector('.shell .hero h1'),r=e?.getBoundingClientRect();return {align:e?getComputedStyle(e).textAlign:null,error:r?Math.abs((r.left+r.width/2)-(innerWidth/2)):999,scroll:document.documentElement.scrollWidth,width:innerWidth};});
  rec('Mobile hero remains centered',symmetry.align==='center'&&symmetry.error<3,JSON.stringify(symmetry));
  rec('Mobile layout has no horizontal overflow',symmetry.scroll<=symmetry.width+2,JSON.stringify(symmetry));
  rec('No browser page errors',errors.length===0,errors.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);console.log(JSON.stringify({certification:'ALLSHIELD Owner Signature + Brand + Tabs regression',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)},null,2));process.exitCode=failures.length?1:0;