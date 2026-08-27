import { chromium } from 'playwright';
const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const PROJECT_ID='e03b071d-4b63-45f2-bc41-c79861a377f7';
const checks=[];const rec=(name,ok,detail='')=>checks.push({name,ok,detail});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function live(path){const r=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}cert=${Date.now()}`,{redirect:'follow',cache:'no-store'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return await r.text();}
async function waitDeploy(){for(let i=0;i<36;i++){try{const [cfg,patch]=await Promise.all([live('/config.js'),live('/video-studio-stability-2026-08-27.js')]);if(cfg.includes('video-studio-stability-2026-08-27.js?v=2026.08.27.003')&&patch.includes("VERSION='2026.08.27.003'")&&patch.includes('stopImmediatePropagation'))return;}catch{}await sleep(5000)}throw new Error('Video Studio stability patch did not become live in time.');}
let browser;
try{
  await waitDeploy();rec('Stability patch deployed',true,'v2026.08.27.003 is live');
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  const response=await page.goto(`${BASE}/?v=2026.08.27.003`,{waitUntil:'domcontentloaded',timeout:60000});rec('Live site navigation',!!response&&response.ok(),response?`HTTP ${response.status()}`:'no response');
  await page.waitForFunction(()=>typeof window.showOwnerView==='function'&&typeof window.allshieldViewHandlers?.owner?.video==='function',{timeout:30000});
  await page.evaluate(({PROJECT_ID})=>{
    const owner={id:'3320a7d1-bfd6-4761-ad5b-b7fadb3b8d9c',email:'owner@allshield.internal'};
    const project={id:PROJECT_ID,created_by:owner.id,title:'Why Join Our Team',project_type:'short',orientation:'16:9',target_duration_seconds:180,topic:'Allshield recruiting opportunity',objective:'recruiting',audience:'Licensed or not-yet-licensed agents',tone:'Professional',source_material:'Approved owner-supplied recruiting facts',call_to_action:'Join our team',status:'script_ready',hook:'What if selling insurance started after the customer already asked to speak with you?',outline:['Stop chasing','Live transfer model','Agent support','Join our team'],script:'Prepared production script for the Allshield three-minute careers opportunity sizzle. This certification text proves the linked project is loaded without creating a blank duplicate record. '.repeat(5),storyboard:Array.from({length:15},(_,i)=>({title:`Scene ${i+1}`,duration_seconds:12,narration:`Narration ${i+1}`,visual_direction:`Visual ${i+1}`,on_screen_text:`Scene ${i+1}`,sora_prompt:`Premium Allshield scene ${i+1}`})),captions:'Prepared captions',youtube_title:'Why Join Our Team',youtube_description:'Allshield opportunity',tags:['allshield','insurance careers'],thumbnail_prompt:'Allshield careers opportunity',publish_destinations:['careers_opportunity_sizzle'],scheduled_for:null,metadata:{destination_label:'Careers Page → 3-Minute Opportunity Sizzle'},updated_at:new Date().toISOString(),created_at:new Date().toISOString()};
    window.__videoInsertCount=0;
    function tableRows(t){if(t==='video_projects')return [project];if(t==='video_project_assets'||t==='video_publish_jobs'||t==='social_connections')return [];return [];}
    function b(t,rows=tableRows(t)){
      let current=rows;
      const api=new Proxy({}, {get(_x,p){
        if(p==='then')return resolve=>resolve({data:current,error:null,count:current.length});
        if(p==='single'||p==='maybeSingle')return()=>Promise.resolve({data:current[0]||null,error:null});
        if(p==='select'||p==='order'||p==='limit'||p==='in'||p==='gte'||p==='lte'||p==='neq'||p==='is')return()=>api;
        if(p==='eq')return(key,val)=>{if(t==='video_projects'&&key==='id')current=current.filter(x=>x.id===val);return api;};
        if(p==='update')return patch=>{if(t==='video_projects')Object.assign(project,patch);return b(t,current);};
        if(p==='insert')return payload=>{if(t==='video_projects')window.__videoInsertCount++;return b(t,t==='video_projects'?[project]:[]);};
        if(p==='upsert')return()=>b(t,current);
        if(p==='delete')return()=>b(t,current);
        return()=>api;
      }});return api;
    }
    const storage={list:async()=>({data:[],error:null}),upload:async()=>({data:{},error:null}),remove:async()=>({data:{},error:null}),createSignedUrl:async()=>({data:{signedUrl:'about:blank'},error:null}),getPublicUrl:()=>({data:{publicUrl:'about:blank'}})};
    window.allshieldSupabase={auth:{getUser:async()=>({data:{user:owner},error:null}),getSession:async()=>({data:{session:{user:owner}},error:null})},from:t=>b(t),functions:{invoke:async(name,opt)=>{if(name==='video-studio-ai'&&opt?.body?.action==='status')return {data:{ok:true,backend_version:3,ai_ready:false},error:null};if(name==='video-studio-ai'&&opt?.body?.action==='generate_package')return {data:{ok:true,project,reused_existing_package:true,provider_ready:false},error:null};if(name==='youtube-oauth')return {data:{ok:true,configured:false,connection:{status:'not_connected'}},error:null};if(name==='youtube-publish')return {data:{ok:true},error:null};return {data:{ok:true},error:null};}},storage:{from:()=>storage}};
    document.querySelector('.shell')?.setAttribute('style','display:none!important');document.getElementById('ownerPortal')?.classList.add('show');
  },{PROJECT_ID});
  await page.evaluate(()=>window.showOwnerView('video',null));await page.waitForSelector('#ytGeneratePackage',{timeout:15000});await page.waitForTimeout(700);
  await page.fill('#ytProjectTitle','Why Join Our Team');await page.fill('#ytProjectDuration','180');await page.selectOption('#ytProjectObjective','recruiting');await page.fill('#ytProjectAudience','Licensed or not-yet-licensed agents');
  const before=await page.evaluate(()=>window.__videoInsertCount);rec('No pre-existing duplicate inserts',before===0,`insert_count=${before}`);
  await page.locator('#ytGeneratePackage').click();
  await page.waitForFunction(()=>document.getElementById('ytCreateResult')?.textContent?.includes('Production package ready'),{timeout:12000});
  const result=await page.locator('#ytCreateResult').innerText();const inserts=await page.evaluate(()=>window.__videoInsertCount);const scriptLen=await page.locator('#ytScript').inputValue().then(v=>v.length);const scriptTab=await page.locator('[data-yt-panel="script"]').evaluate(el=>el.classList.contains('on'));
  rec('Generate returns prepared package',result.includes('Production package ready')&&!result.includes('non-2xx'),result);
  rec('Generate creates no duplicate project',inserts===0,`video_projects inserts=${inserts}`);
  rec('Canonical script opens for review',scriptTab&&scriptLen>100,`script_tab=${scriptTab}; script_chars=${scriptLen}`);
  rec('No browser page errors',pageErrors.length===0,pageErrors.join(' | ')||'none');
}catch(e){rec('Certification execution',false,e?.stack||e?.message||String(e));}finally{if(browser)await browser.close();}
const failures=checks.filter(x=>!x.ok);const out={certification:'ALLSHIELD Careers Sizzle Video Studio stability certification',base_url:BASE,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)};console.log(JSON.stringify(out,null,2));process.exitCode=failures.length?1:0;
