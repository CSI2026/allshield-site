(()=>{
'use strict';
const VERSION='B2026.08.29.040';
const sb=window.allshieldSupabase;
if(!sb)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
const num=v=>Number(v||0);
const monthStart=()=>new Date().toISOString().slice(0,7)+'-01';

function payoutText(r){
  if(r.payout_type==='percent_of_value')return `${num(r.amount)}% of qualifying value`;
  if(r.payout_type==='per_unit_bonus')return `${money(r.amount)} per qualifying unit`;
  return money(r.amount);
}

async function loadBonusQualification(){
  const main=document.getElementById('agentMain');
  if(!main||!window.ALLSHIELD_AGENT_COMP_PROGRAM)return;
  main.querySelector('#ucBonusQualificationCard')?.remove();
  try{
    const {data:ud}=await sb.auth.getUser();const u=ud?.user;if(!u)return;
    const code=window.ALLSHIELD_AGENT_COMP_PROGRAM;
    const {data:campaign,error:ce}=await sb.from('campaigns').select('id,code,name').eq('code',code).maybeSingle();if(ce||!campaign)return;
    const {data:plan,error:pe}=await sb.from('comp_plan_versions').select('id,version,metric_key,unit_label').eq('campaign_id',campaign.id).eq('status','published').order('version',{ascending:false}).limit(1).maybeSingle();if(pe||!plan)return;
    const [snapQ,rulesQ]=await Promise.all([
      sb.from('comp_qualification_snapshots').select('units,production_value,current_tier,next_tier,bonus_progress,updated_at').eq('campaign_id',campaign.id).eq('plan_version_id',plan.id).eq('user_id',u.id).eq('qualification_month',monthStart()).maybeSingle(),
      sb.from('comp_bonus_rules').select('id,rule_type,rule_name,threshold,amount,payout_type').eq('plan_version_id',plan.id).eq('active',true).eq('applies_to_role','agent').eq('aggregation_scope','self').eq('period','monthly').eq('metric_key',plan.metric_key).order('rule_type').order('threshold')
    ]);
    if(rulesQ.error)throw rulesQ.error;
    const snap=snapQ.data||null,units=num(snap?.units),saved=Array.isArray(snap?.bonus_progress)?snap.bonus_progress:[];
    const progress=(rulesQ.data||[]).map(r=>{
      const x=saved.find(s=>String(s.rule_id)===String(r.id));
      return x||{rule_id:r.id,rule_type:r.rule_type,rule_name:r.rule_name,threshold:r.threshold,amount:r.amount,payout_type:r.payout_type,qualified:units>=num(r.threshold),units_needed:Math.max(0,num(r.threshold)-units),payable_at_current_level:false};
    });
    const grouped=new Map();for(const r of progress){const k=String(r.rule_type);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(r)}
    for(const rows of grouped.values()){
      const achieved=rows.filter(r=>r.qualified).sort((a,b)=>num(b.threshold)-num(a.threshold))[0];
      rows.forEach(r=>r.payable_at_current_level=!!achieved&&String(r.rule_id)===String(achieved.rule_id));
    }
    const card=document.createElement('div');card.id='ucBonusQualificationCard';card.className='bo-card';card.style.marginTop='18px';
    card.innerHTML=`<div class="kicker">BONUS QUALIFICATION TRACKING</div><h3 style="margin-top:6px">Your live bonus progress</h3><p class="uc-section-note">This is driven by the published compensation version and real recorded production for ${esc(campaign.name)}.</p>${progress.length?progress.map(r=>{const threshold=num(r.threshold),pct=threshold>0?Math.min(100,Math.round(units/threshold*100)):100;return `<div class="uc-tier-card ${r.qualified?'current':''}"><div class="requirement"><span><strong>${esc(r.rule_name||r.rule_type)}</strong><small style="display:block">${threshold}+ ${esc(plan.unit_label)}${threshold===1?'':'s'} • ${esc(payoutText(r))}</small></span><span class="pill">${r.qualified?(r.payable_at_current_level?'QUALIFIED':'THRESHOLD MET'):`${num(r.units_needed)} TO GO`}</span></div><div class="uc-progress"><span style="width:${pct}%"></span></div><div class="uc-mini">${units} / ${threshold}${r.payable_at_current_level?' • current payable threshold for this bonus type':''}</div></div>`}).join(''):'<p>No individual monthly bonus rules are configured for this program.</p>'}${snap?`<div class="uc-mini">Qualification snapshot updated ${new Date(snap.updated_at).toLocaleString()}.</div>`:'<div class="uc-mini">No production has created a qualification snapshot yet. Progress starts at 0 until real qualifying production is recorded.</div>'}`;
    main.appendChild(card);
  }catch(e){console.error('Bonus qualification tracking',e)}
}

function install(){
  if(window.__compQualificationUIInstalled)return;
  const old=window.loadUniversalAgentComp;
  if(typeof old!=='function')return setTimeout(install,80);
  window.__compQualificationUIInstalled=true;
  window.loadUniversalAgentComp=async function(){await old.apply(this,arguments);await loadBonusQualification()};
  window.ALLSHIELD_COMP_QUALIFICATION_UI_VERSION=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
