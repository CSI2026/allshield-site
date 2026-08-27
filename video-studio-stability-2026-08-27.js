(()=>{
'use strict';
const VERSION='2026.08.27.002';
const norm=v=>String(v||'').trim().toLowerCase();
let cfgPromise=null,busy=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function sb(){for(let i=0;i<120;i++){if(window.allshieldSupabase)return window.allshieldSupabase;await sleep(50)}throw new Error('Supabase is not initialized.');}
async function config(){
  if(cfgPromise)return cfgPromise;
  cfgPromise=(async()=>{const c=window.ALLSHIELD_CONFIG||{};const r=await fetch(`${c.SUPABASE_URL}/functions/v1/career-sizzle-config`,{headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY||''}});const d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(d.error||`Career sizzle config HTTP ${r.status}`);return d;})();
  try{return await cfgPromise}catch(e){cfgPromise=null;throw e}
}
function result(msg,good=false){const e=document.getElementById('ytCreateResult');if(!e)return;e.textContent=msg;e.classList.add('show');e.style.color=good?'#a7e4c1':'';}
function linkedContext(cfg){
  const title=document.getElementById('ytProjectTitle')?.value||'';
  const current=document.querySelector('#ytCurrentProject strong')?.textContent||'';
  const card=document.querySelector(`[data-project-id="${cfg.project_id}"]`);
  return norm(title)===norm(cfg.title)||norm(current)===norm(cfg.title)||!!card?.classList.contains('on');
}
async function selectCanonical(cfg){
  let card=document.querySelector(`[data-project-id="${cfg.project_id}"]`);
  if(!card){document.getElementById('ytRefreshProjects')?.click();await sleep(450);card=document.querySelector(`[data-project-id="${cfg.project_id}"]`);}
  if(card){card.click();await sleep(450);return true}
  return false;
}
async function saveCanonical(cfg){
  const c=await sb();
  const {data:existing,error:readError}=await c.from('video_projects').select('*').eq('id',cfg.project_id).single();
  if(readError)throw readError;
  const val=id=>document.getElementById(id)?.value?.trim?.()||'';
  const patch={
    title:cfg.title||existing.title,
    project_type:'short',
    orientation:val('ytProjectOrientation')||existing.orientation||'16:9',
    target_duration_seconds:180,
    objective:val('ytProjectObjective')||existing.objective||'recruiting',
    audience:val('ytProjectAudience')||existing.audience||null,
    tone:val('ytProjectTone')||existing.tone||'Professional',
    topic:val('ytProjectTopic')||existing.topic||null,
    source_material:val('ytProjectSource')||existing.source_material||null,
    call_to_action:val('ytProjectCta')||existing.call_to_action||'Join our team',
    publish_destinations:Array.from(new Set([...(existing.publish_destinations||[]),'careers_opportunity_sizzle'])),
    metadata:{...(existing.metadata||{}),destination_label:cfg.destination_label||'Careers Page → 3-Minute Opportunity Sizzle',destination_slot:cfg.slot||'career_sizzle_placeholder',linked_career_sizzle:true,stability_patch:VERSION},
    updated_at:new Date().toISOString()
  };
  const {data,error}=await c.from('video_projects').update(patch).eq('id',cfg.project_id).select('*').single();if(error)throw error;return data;
}
async function generateLinked(cfg,button){
  if(busy)return;busy=true;if(button)button.disabled=true;
  try{
    result('Loading the linked 3-minute production package…');
    await saveCanonical(cfg);
    const c=await sb();
    const {data,error}=await c.functions.invoke('video-studio-ai',{body:{action:'generate_package',project_id:cfg.project_id}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    if(!data?.project?.id)throw new Error('Video Studio did not return the linked project.');
    await selectCanonical(cfg);
    document.querySelector('[data-yt-tab="script"]')?.click();
    const scenes=Array.isArray(data.project.storyboard)?data.project.storyboard.length:0;
    result(`Production package ready — 3:00 • ${scenes||15} scenes • linked to ${cfg.destination_label||'Careers Page → 3-Minute Opportunity Sizzle'}.`,true);
  }catch(e){result('Error: '+(e?.message||e));}
  finally{busy=false;if(button)button.disabled=false;}
}
async function saveLinked(cfg,button){
  if(busy)return;busy=true;if(button)button.disabled=true;
  try{await saveCanonical(cfg);await selectCanonical(cfg);result('Linked Careers sizzle project saved — 3:00 destination preserved.',true)}catch(e){result('Error: '+(e?.message||e))}finally{busy=false;if(button)button.disabled=false;}
}
document.addEventListener('click',async e=>{
  const b=e.target?.closest?.('#ytGeneratePackage,#ytSaveDraft');if(!b)return;
  let cfg;try{cfg=await config()}catch{return}
  if(!cfg?.project_id||!linkedContext(cfg))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(b.id==='ytGeneratePackage')await generateLinked(cfg,b);else await saveLinked(cfg,b);
},true);
async function bindStudio(){
  const studio=document.getElementById('ytStudio');if(!studio||studio.dataset.sizzleStability===VERSION)return;
  studio.dataset.sizzleStability=VERSION;
  try{
    const cfg=await config();await sleep(400);
    const title=document.getElementById('ytProjectTitle')?.value||'';
    if(norm(title)===norm(cfg.title))await selectCanonical(cfg);
    const banner=studio.querySelector('.real-data-banner');if(banner&&cfg?.project_id)banner.dataset.sizzleProjectId=cfg.project_id;
  }catch{}
}
function install(){if(window.ALLSHIELD_VIDEO_STUDIO_STABILITY_VERSION===VERSION)return;window.ALLSHIELD_VIDEO_STUDIO_STABILITY_VERSION=VERSION;bindStudio();const o=new MutationObserver(()=>bindStudio());o.observe(document.documentElement,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();