(() => {
  const sb=window.allshieldSupabase,cfg=window.ALLSHIELD_CONFIG||{};
  if(!sb)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const dt=v=>v?new Date(v).toLocaleString():'—';
  async function user(){const {data,error}=await sb.auth.getUser();if(error)throw error;return data?.user}
  async function session(){const {data,error}=await sb.auth.getSession();if(error)throw error;return data?.session}
  function registryCheck(){
    const expected={
      agent:['dashboard','onboarding','licensing','study','tests','production','crm','communications','meetings','documents'],
      admin:['dashboard','courses','tests','production','crm','communications','meetings','documents','compensation','mailhub','aiworkforce','settings','media'],
      owner:['dashboard','agenttesting','recruiting','crm','communications','meetings','compensation','financials','mailhub','aiworkforce','settings','media','files','health']
    };
    const regs={agent:window.agentViews,admin:window.adminViews,owner:window.ownerViews};
    const missing=[];
    for(const [type,views] of Object.entries(expected)) for(const v of views) if(!regs[type]||typeof regs[type][v]!=='string') missing.push(`${type}:${v}`);
    return {ok:window.__allshieldViewRegistryReady===true&&missing.length===0,detail:missing.length?`Missing: ${missing.join(', ')}`:'Agent, Admin and Owner production views registered'};
  }
  window.loadProductionHealth=async function(){
    const h=document.getElementById('prodHealthHost');if(!h)return;h.innerHTML='<div class="bo-card">Running live checks…</div>';
    const checks=[];
    const reg=registryCheck();checks.push(['Portal module registry',reg.ok,reg.detail]);
    try{const u=await user();checks.push(['Authentication',!!u,u?'Signed-in session verified':'No signed-in user'])}catch(e){checks.push(['Authentication',false,e.message])}
    try{const u=await user();const {data,error}=await sb.from('profiles').select('role,status').eq('id',u.id).single();checks.push(['Profile / permissions',!error&&!!data,!error?`${data.role} • ${data.status}`:error.message])}catch(e){checks.push(['Profile / permissions',false,e.message])}
    try{const {data,error}=await sb.from('academy_launch_readiness').select('state_code,launch_ready,end_to_end_tested,updated_at').in('state_code',['GA','TX','FL','TN']);const rows=data||[];const good=!error&&rows.length===4&&rows.every(x=>x.launch_ready&&x.end_to_end_tested);checks.push(['GA / TX / FL / TN Academy',good,error?error.message:rows.map(x=>`${x.state_code}:${x.launch_ready?'ready':'not ready'}`).join(' • ')])}catch(e){checks.push(['GA / TX / FL / TN Academy',false,e.message])}
    try{const {data,error}=await sb.from('curriculum_validation_findings').select('id').is('resolved_at',null).eq('severity','critical');checks.push(['Critical curriculum findings',!error&&(data||[]).length===0,error?error.message:`${(data||[]).length} open critical finding(s)`])}catch(e){checks.push(['Critical curriculum findings',false,e.message])}
    try{const {data,error}=await sb.from('mail_sync_runs').select('status,started_at,error_text').order('started_at',{ascending:false}).limit(1);const r=data?.[0];checks.push(['Email sync',!error&&r?.status==='completed',error?error.message:r?`${r.status} • ${dt(r.started_at)}${r.error_text?' • '+r.error_text:''}`:'No sync run found'])}catch(e){checks.push(['Email sync',false,e.message])}
    try{const {data,error}=await sb.from('social_accounts').select('id,status').eq('status','connected');checks.push(['Social platform connections',!error&&(data||[]).length>0,error?error.message:`${(data||[]).length} connected account(s)`])}catch(e){checks.push(['Social platform connections',false,e.message])}
    try{const s=await session();const r=await fetch(`${cfg.SUPABASE_URL}/functions/v1/ai-provider-status`,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${s.access_token}`},body:'{}'});const j=await r.json();checks.push(['AI provider',r.ok&&j.configured===true,j.configured?'OpenAI provider configured':'OPENAI_API_KEY not configured'])}catch(e){checks.push(['AI provider',false,e.message])}
    checks.push(['Owner View As',typeof window.ownerViewAsAgent==='function',typeof window.ownerViewAsAgent==='function'?'Loaded':'Missing']);
    checks.push(['Owner Testing & Scores',typeof window.loadOwnerTestingOverview==='function'&&typeof window.ownerViews?.agenttesting==='string',typeof window.ownerViews?.agenttesting==='string'?'View and loader registered':'View or loader missing']);
    const bad=[...document.images].filter(i=>/brand-[a-f0-9]+\.webp/i.test(i.getAttribute('src')||'')&&!String(i.getAttribute('src')).includes('brand-914a23072410.webp'));
    checks.push(['Approved logo',bad.length===0,bad.length?`${bad.length} visible mismatch(es)`:'Approved logo enforced']);
    const pass=checks.filter(x=>x[1]).length,internal=checks.filter(x=>!['Social platform connections','AI provider'].includes(x[0]));
    h.innerHTML=`<div class="stat-grid"><div class="stat"><div class="label">Checks Passed</div><div class="value">${pass}/${checks.length}</div></div><div class="stat"><div class="label">Internal Launch</div><div class="value">${internal.every(x=>x[1])?'READY':'CHECK'}</div></div><div class="stat"><div class="label">External Integrations</div><div class="value">${checks.filter(x=>['Social platform connections','AI provider'].includes(x[0])).every(x=>x[1])?'READY':'PENDING'}</div></div></div><div class="bo-card" style="margin-top:18px">${checks.map(([name,good,detail])=>`<div class="requirement"><span><strong>${esc(name)}</strong><small style="display:block;color:#8296ab;margin-top:3px">${esc(detail)}</small></span><span class="pill">${good?'PASS':'CHECK'}</span></div>`).join('')}</div>`;
  };
})();
