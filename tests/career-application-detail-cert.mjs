import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  let config='';
  for(let i=0;i<60;i++){
    config=await fetch(`${BASE}/config.js?careerfilecert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text());
    if(config.includes('career-application-detail-2026-08-28.js?v=2026.08.28.001'))break;
    await sleep(2000);
  }
  rec('Production config loads career application detail module',config.includes('career-application-detail-2026-08-28.js?v=2026.08.28.001'),'career application detail .001');
  const source=await fetch(`${BASE}/career-application-detail-2026-08-28.js?cert=${Date.now()}`,{cache:'no-store'}).then(r=>r.text());
  rec('Applicant names are rendered as clickable application links',source.includes('class="as-applicant-link"')&&source.includes('asOpenCareerApplication'), 'clickable applicant name + open handler');
  rec('Complete application query uses the exact application id',source.includes("from('career_applications').select('*').eq('id',id).single()"),'exact record lookup');
  rec('Application activity history is included',source.includes("from('pipeline_activity')")&&source.includes('Activity History'),'pipeline activity included');
  rec('No whole-page MutationObserver added',!source.includes('MutationObserver'),'none');
  rec('No recurring interval added',!source.includes('setInterval('),'none');

  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(`${BASE}/?careerfilecert=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
  rec('Live homepage loads',response?.ok()===true,`HTTP ${response?.status()}`);
  await page.waitForFunction(()=>window.ALLSHIELD_CAREER_APPLICATION_DETAIL_VERSION==='2026.08.28.001',{timeout:25000});
  rec('Career application detail runtime executes',await page.evaluate(()=>window.ALLSHIELD_CAREER_APPLICATION_DETAIL_VERSION==='2026.08.28.001'),'.001 active');
  rec('Full application open function is available',await page.evaluate(()=>typeof window.asOpenCareerApplication==='function'),'function active');
  rec('Application modal exists',await page.evaluate(()=>!!document.getElementById('asCareerApplicationFile')),'modal mounted');

  const detail=await page.evaluate(async()=>{
    const original=window.allshieldSupabase;
    const app={id:'app-test-1',full_name:'Test Applicant',email:'test@example.com',phone:'555-0100',licensing_status:'licensed',resident_state:'TX',status:'approved',source:'website_careers',assigned_to:null,converted_user_id:null,notes:'Complete internal note',ip_hash:'SECRET-HASH-MUST-NOT-DISPLAY',created_at:'2026-08-28T10:00:00Z',updated_at:'2026-08-28T10:05:00Z',converted_at:null,custom_question:'Custom answer'};
    const activity=[{action:'status_changed',details:{from:'new',to:'approved'},created_at:'2026-08-28T10:05:00Z'}];
    window.allshieldSupabase={
      from(table){
        if(table==='career_applications'){
          const q={select(){return q},eq(){return q},single:async()=>({data:app,error:null})};return q;
        }
        if(table==='pipeline_activity'){
          const q={select(){return q},eq(){return q},order(){return q},limit:async()=>({data:activity,error:null})};return q;
        }
        if(table==='profiles'){
          const q={select(){return q},in:async()=>({data:[],error:null})};return q;
        }
        throw new Error('Unexpected table '+table);
      }
    };
    await window.asOpenCareerApplication('app-test-1');
    const modal=document.getElementById('asCareerApplicationFile');
    const text=modal?.textContent||'';
    const out={show:modal?.classList.contains('show'),text,rawHashVisible:text.includes('SECRET-HASH-MUST-NOT-DISPLAY')};
    window.asCloseCareerApplication();
    window.allshieldSupabase=original;
    return out;
  });
  for(const required of ['Test Applicant','test@example.com','555-0100','Licensed','Texas','Approved','Complete internal note','Custom answer','Status Changed']){
    rec(`Application viewer shows ${required}`,detail.text.includes(required),required);
  }
  rec('Application viewer opens as a modal',detail.show,'show class active');
  rec('Raw security hash stays protected',!detail.rawHashVisible,'raw hash hidden');
  rec('No browser page errors',errors.length===0,errors.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);const out={certification:'ALLSHIELD full career application file production certification',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
