(()=>{
'use strict';
const VERSION='2026.08.28.003';
const LOGO='./assets/brand-9aa0ec99b3b0.webp';
const ONBOARDING_EMAIL='onboarding@allshieldinsurancegroup.com';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sb=()=>window.allshieldSupabase;

function toastSafe(msg){try{if(typeof window.toast==='function')window.toast(msg);else alert(msg)}catch{alert(msg)}}

function injectStyles(){
  if(document.getElementById('allshieldOwnerSignatureCss'))return;
  const s=document.createElement('style');
  s.id='allshieldOwnerSignatureCss';
  s.textContent=`
    .as-owner-signature-shell{display:grid;gap:16px}
    .as-owner-brand-card{display:grid;grid-template-columns:90px 1fr;gap:18px;align-items:center}
    .as-owner-brand-card img{width:82px;height:auto;display:block;filter:drop-shadow(0 10px 18px rgba(0,0,0,.28))}
    .as-owner-brand-card h3{margin:0 0 6px;font-size:24px}.as-owner-brand-card p{margin:0;color:#8fa4ba;line-height:1.55}
    .as-signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .as-signature-grid label{display:block;color:#8fa4ba;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
    .as-signature-canvas-wrap{margin-top:14px;border:1px solid rgba(119,200,255,.22);background:#fff;border-radius:16px;overflow:hidden;position:relative}
    #asOwnerSignatureCanvas{display:block;width:100%;height:220px;touch-action:none;cursor:crosshair;background:#fff}
    .as-sign-hint{position:absolute;left:16px;top:14px;color:#8b98a6;font-size:12px;pointer-events:none}
    .as-owner-saved-preview{border:1px solid rgba(255,255,255,.09);background:#081523;border-radius:14px;padding:14px;margin-top:12px}
    .as-owner-saved-preview img{max-width:360px;width:100%;height:95px;object-fit:contain;background:#fff;border-radius:10px;display:block;margin-top:8px}
    .as-owner-pillars{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}
    .as-owner-pillar{border:1px solid rgba(255,255,255,.08);background:#0b1829;border-radius:14px;padding:15px;text-align:center}
    .as-owner-pillar strong{display:block;color:#7bcaff;font-size:15px;margin-bottom:5px}.as-owner-pillar small{color:#8fa4ba;line-height:1.4}
    .as-owner-security{border-left:4px solid #69b9f1;background:rgba(105,185,241,.07);padding:13px 15px;border-radius:10px;color:#b9c8d8;line-height:1.55;font-size:12px}
    .as-owner-email-card strong{color:#fff}.as-owner-email-card code{color:#7bcaff;font-size:13px}
    @media(max-width:760px){.as-owner-brand-card{grid-template-columns:64px 1fr}.as-owner-brand-card img{width:60px}.as-signature-grid{grid-template-columns:1fr}.as-owner-pillars{grid-template-columns:1fr 1fr}#asOwnerSignatureCanvas{height:190px}}
  `;
  document.head.appendChild(s);
}

function viewHtml(){
  return `<div class="dashboard-head"><div><div class="kicker">OWNER SIGNATURE & AGREEMENTS</div><h2>Your authorized company signature.</h2><p>Draw your signature with a finger, mouse, or stylus, type your legal name and title, then save it to your owner-only profile.</p></div></div>
  <div class="real-data-banner">OWNER-ONLY • LIVE SUPABASE DATA • NO SIGNATURE FILE UPLOADS</div>
  <div class="as-owner-signature-shell" style="margin-top:18px">
    <div class="bo-card as-owner-brand-card"><img src="${LOGO}" alt="ALLSHIELD Insurance Group approved shield logo"><div><h3>ALLSHIELD Agreement Identity</h3><p>The approved shield brand is the document identity for ALLSHIELD agreements, onboarding communications, and the website.</p></div></div>
    <div class="bo-card"><h3>Owner Signature Profile</h3><div class="as-signature-grid"><div><label>Full Legal Name</label><input id="asOwnerTypedName" class="mini-input" autocomplete="name"></div><div><label>Title</label><input id="asOwnerTitle" class="mini-input" value="President"></div><div style="grid-column:1/-1"><label>Company / Legal Entity</label><input id="asOwnerCompany" class="mini-input" value="ALLSHIELD Insurance Group"></div></div><div class="as-signature-canvas-wrap"><canvas id="asOwnerSignatureCanvas" aria-label="Draw owner signature"></canvas><span id="asOwnerSignHint" class="as-sign-hint">Sign here with your finger, mouse, or stylus</span></div><div class="row-actions" style="margin-top:12px"><button type="button" class="tiny-btn" onclick="asClearOwnerSignatureCanvas()">Clear Canvas</button><button type="button" class="btn btn-primary" onclick="asSaveOwnerSignature()">Save Owner Signature</button></div><div class="as-owner-security" style="margin-top:14px"><strong>Security rule:</strong> saving this signature does not automatically stamp it onto a contract. It is stored for the authenticated Owner only. Applying it to a specific agreement will require an explicit Owner authorization step when the e-sign workflow is enabled.</div><div id="asOwnerSignatureStatus" class="as-owner-saved-preview">Loading saved signature status…</div></div>
    <div class="bo-card as-owner-email-card"><h3>Onboarding Email Identity</h3><p style="color:#8fa4ba;line-height:1.6">Licensed and non-licensed onboarding communications use:</p><p><strong>ALLSHIELD Onboarding</strong><br><code>${ONBOARDING_EMAIL}</code></p><p style="color:#8fa4ba;font-size:12px">The address is configured as an ALLSHIELD mail alias. Automated activation delivery remains separated from account creation until the final activation/security flow is approved.</p></div>
    <div class="bo-card"><div class="kicker">NATIONAL BRAND BLUEPRINT</div><h3 style="margin-top:8px">The Four Pillars</h3><p style="color:#8fa4ba;line-height:1.6">ACA launches the Health pillar first. The company blueprint stays broader than the launch product so the back office is built for national scale.</p><div class="as-owner-pillars"><div class="as-owner-pillar"><strong>Life</strong><small>Life insurance</small></div><div class="as-owner-pillar"><strong>Health</strong><small>ACA first, additional health products later</small></div><div class="as-owner-pillar"><strong>Auto</strong><small>Personal auto insurance</small></div><div class="as-owner-pillar"><strong>Home</strong><small>Homeowners and renters insurance</small></div></div></div>
  </div>`;
}

function addNav(){
  const side=document.querySelector('#ownerPortal .sidebar');
  if(!side||side.querySelector('[data-owner-signature-link]'))return;
  const d=document.createElement('div');
  d.className='side-link';
  d.dataset.ownerSignatureLink='1';
  d.innerHTML='✍ Signature & Agreements';
  d.setAttribute('onclick',"showOwnerView('signature',this)");
  const marker=[...side.querySelectorAll('.side-link')].find(x=>/Audit|Build History|Settings/i.test(x.textContent||''));
  side.insertBefore(d,marker||null);
}

function setupCanvas(){
  const canvas=$('#asOwnerSignatureCanvas');
  if(!canvas||canvas.dataset.ready==='1')return;
  canvas.dataset.ready='1';
  const ctx=canvas.getContext('2d');
  let drawing=false,last=null;
  function sizeCanvas(){
    const rect=canvas.getBoundingClientRect(),dpr=Math.max(1,window.devicePixelRatio||1);
    const old=canvas.dataset.ink==='1'?canvas.toDataURL('image/png'):null;
    canvas.width=Math.max(1,Math.round(rect.width*dpr));
    canvas.height=Math.max(1,Math.round(rect.height*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.lineWidth=2.4;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#07111f';
    if(old){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,rect.width,rect.height);img.src=old;}
  }
  const pos=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();drawing=true;last=pos(e);canvas.setPointerCapture?.(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;canvas.dataset.ink='1';const h=$('#asOwnerSignHint');if(h)h.style.display='none';});
  const stop=e=>{if(drawing){drawing=false;last=null;try{canvas.releasePointerCapture?.(e.pointerId)}catch{}}};
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('pointerleave',e=>{if(e.buttons===0)stop(e)});
  sizeCanvas();
}

window.asClearOwnerSignatureCanvas=function(){
  const canvas=$('#asOwnerSignatureCanvas');if(!canvas)return;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);canvas.dataset.ink='0';
  const h=$('#asOwnerSignHint');if(h)h.style.display='block';
};

async function loadSaved(){
  const c=sb(),status=$('#asOwnerSignatureStatus');if(!c||!status)return;
  try{
    const {data:u,error:ue}=await c.auth.getUser();if(ue||!u?.user)throw(ue||new Error('Owner session required.'));
    const [{data:p},{data:sig,error:se}]=await Promise.all([
      c.from('profiles').select('first_name,last_name').eq('id',u.user.id).single(),
      c.from('owner_signature_profiles').select('typed_name,title,company_name,signature_data_url,updated_at').eq('user_id',u.user.id).maybeSingle()
    ]);
    if(se)throw se;
    const typed=$('#asOwnerTypedName'),title=$('#asOwnerTitle'),company=$('#asOwnerCompany');
    if(typed&&!typed.value)typed.value=sig?.typed_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ');
    if(title)title.value=sig?.title||title.value||'President';
    if(company)company.value=sig?.company_name||company.value||'ALLSHIELD Insurance Group';
    if(sig?.signature_data_url){status.innerHTML=`<strong>Saved owner signature</strong><small style="display:block;color:#8fa4ba;margin-top:4px">${esc(sig.typed_name)} • ${esc(sig.title)} • Updated ${new Date(sig.updated_at).toLocaleString()}</small><img src="${esc(sig.signature_data_url)}" alt="Saved owner signature preview">`;}
    else status.innerHTML='<strong>No saved owner signature yet.</strong><small style="display:block;color:#8fa4ba;margin-top:4px">Draw and save your signature above when you are ready.</small>';
  }catch(e){status.innerHTML=`<strong>Unable to load signature status.</strong><small style="display:block;color:#ffb4b4;margin-top:4px">${esc(e.message||e)}</small>`;}
}

window.asSaveOwnerSignature=async function(){
  const c=sb(),canvas=$('#asOwnerSignatureCanvas'),typed=$('#asOwnerTypedName')?.value.trim(),title=$('#asOwnerTitle')?.value.trim(),company=$('#asOwnerCompany')?.value.trim();
  if(!c)return toastSafe('ALLSHIELD connection is not ready.');
  if(!typed||!title||!company)return toastSafe('Enter your legal name, title, and company name.');
  if(!canvas||canvas.dataset.ink!=='1')return toastSafe('Draw your signature in the signature box first.');
  try{
    const {data:u,error:ue}=await c.auth.getUser();if(ue||!u?.user)throw(ue||new Error('Owner session required.'));
    const payload={user_id:u.user.id,typed_name:typed,title,company_name:company,signature_data_url:canvas.toDataURL('image/png'),updated_at:new Date().toISOString()};
    const {error}=await c.from('owner_signature_profiles').upsert(payload,{onConflict:'user_id'});if(error)throw error;
    toastSafe('Owner signature saved securely.');await loadSaved();
  }catch(e){toastSafe('Unable to save owner signature: '+(e.message||e));}
};

window.loadOwnerSignatureManagement=async function(){
  injectStyles();const main=document.querySelector('#ownerPortal .portal-main');if(!main)return;
  main.innerHTML=viewHtml();setupCanvas();await loadSaved();
};

function init(){
  injectStyles();
  if(typeof window.ownerViews==='object')window.ownerViews.signature='<div class="bo-card">Loading Owner Signature & Agreements…</div>';
  else if(typeof ownerViews==='object')ownerViews.signature='<div class="bo-card">Loading Owner Signature & Agreements…</div>';
  addNav();
  if(typeof window.showOwnerView==='function'&&!window.showOwnerView.__allshieldSignatureWrapped){
    const old=window.showOwnerView;
    const wrapped=function(view,el){old(view,el);if(view==='signature')setTimeout(()=>window.loadOwnerSignatureManagement?.(),20)};
    wrapped.__allshieldSignatureWrapped=true;window.showOwnerView=wrapped;
  }
  window.ALLSHIELD_OWNER_SIGNATURE_VERSION=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();