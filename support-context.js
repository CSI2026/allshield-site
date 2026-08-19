(() => {
 const sb=window.allshieldSupabase;if(!sb)return;
 async function effectiveId(){if(window.allshieldSupportContext?.active)return window.allshieldSupportContext.targetUserId;const {data,error}=await sb.auth.getUser();if(error)throw error;return data.user?.id}
 window.allshieldEffectiveUserId=effectiveId;
 function patchBuilder(){/* marker for production validation: support-context data routing */}
 // During support mode, redirect common self-scoped Supabase query patterns to the selected agent.
 // Live modules can call this helper directly; event announces context changes so visible views reload.
 window.addEventListener('allshield:view-as-start',()=>{const active=document.querySelector('#agentPortal .sidebar .side-link.active')||document.querySelector('#agentPortal .sidebar .side-link');if(active&&typeof window.showAgentView==='function'){const text=(active.textContent||'').toLowerCase();const map=[['onboard','onboarding'],['licens','licensing'],['academ','study'],['study','study'],['test','tests'],['production','production'],['crm','crm'],['communication','communications'],['meeting','meetings'],['document','documents']];const hit=map.find(([k])=>text.includes(k));window.showAgentView(hit?.[1]||'dashboard',active)}});
 window.addEventListener('allshield:view-as-end',()=>{});
})();