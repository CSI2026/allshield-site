(()=>{
'use strict';
const VERSION='2026.08.28.004';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sb=()=>window.allshieldSupabase;

async function esignContext(){
  const c=sb();if(!c)return null;
  const {data,error}=await c.functions.invoke('document-esign',{body:{action:'get_context'}});
  if(error||data?.error)return null;
  return data;
}
function findStep(title){
  return [...document.querySelectorAll('#agentMain .as-step')].find(x=>(x.querySelector('h3')?.textContent||'').trim()===title)||null;
}
function executed(d){return !!d.signature&&(!d.requires_countersign||!!d.countersign)}
async function patchOnboarding(){
  const host=$('#agentMain');if(!host)return;
  const contract=findStep('Contracting & e-sign');if(!contract)return;
  const ctx=await esignContext();if(!ctx)return;
  const docs=(ctx.documents||[]).filter(d=>d.onboarding_required!==false);
  const allDone=docs.length>0&&docs.every(executed);
  const hasLicense=!!ctx.has_active_license;
  if(!hasLicense){
    contract.innerHTML='<div class="as-step-head"><h3>Contracting & e-sign</h3><span class="as-wait">Locked</span></div><p>This automatically unlocks after your license is verified.</p>';
    return;
  }
  if(allDone){
    contract.innerHTML='<div class="as-step-head"><h3>Contracting & e-sign</h3><span class="as-ok">✓ Fully executed</span></div><p>Your required ALLSHIELD agreements are electronically signed and Owner-countersigned. Your executed records remain available in Documents & E-Sign.</p><button class="btn btn-ghost" onclick="asOpenAgentESignFromOnboarding()">Open Executed Agreements</button>';
  }else{
    const pending=docs.filter(d=>!executed(d)).length;
    contract.innerHTML=`<div class="as-step-head"><h3>Contracting & e-sign</h3><span class="as-wait">Action required</span></div><p>Your license is verified. Review and electronically sign the published ALLSHIELD Independent Contractor Agreement and ACA Marketplace SOP & Compliance Agreement. ${pending} required agreement${pending===1?' is':'s are'} not fully executed yet. The onboarding step completes after the required Owner countersignatures are applied.</p><button class="btn btn-primary" onclick="asOpenAgentESignFromOnboarding()">Open Documents & E-Sign</button>`;
  }
  const comp=findStep('Compensation & pay setup');
  if(comp&&!allDone){
    const p=comp.querySelector('p');
    if(p)p.textContent='Compensation is maintained separately from the Independent Contractor Agreement and Compliance SOP. The compensation step follows completion of the required agreements.';
  }
}
function schedulePatch(){[80,350,900,1800].forEach(ms=>setTimeout(patchOnboarding,ms));}
function patchOwnerSecurityCopy(){
  const el=$('#ownerPortal .as-owner-security');
  if(el)el.innerHTML='<strong>Security rule:</strong> saving this signature does not automatically stamp it onto a contract. It is stored for the authenticated Owner only. Applying it to a specific agreement requires an explicit Owner authorization step in the E-Sign Agreement Center.';
}
function install(){
  window.asAcceptContract=function(){window.asOpenAgentESignFromOnboarding?.();};
  if(typeof window.showAgentView==='function'&&!window.showAgentView.__allshieldEsignBridge){
    const old=window.showAgentView;
    const wrapped=function(view,el){const r=old(view,el);if(view==='onboarding')schedulePatch();return r;};
    wrapped.__allshieldEsignBridge=true;window.showAgentView=wrapped;
  }
  if(typeof window.showOwnerView==='function'&&!window.showOwnerView.__allshieldEsignCopyBridge){
    const old=window.showOwnerView;
    const wrapped=function(view,el){const r=old(view,el);if(view==='signature')setTimeout(patchOwnerSecurityCopy,120);return r;};
    wrapped.__allshieldEsignCopyBridge=true;window.showOwnerView=wrapped;
  }
  document.addEventListener('allshield:agent-onboarding-opened',schedulePatch);
  window.ALLSHIELD_ONBOARDING_ESIGN_BRIDGE_VERSION=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();