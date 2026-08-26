(()=>{
"use strict";

const VERSION="B2026.08.23.021";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const toastMsg=m=>{try{ if(typeof window.toast==='function') window.toast(m); else alert(m); }catch{alert(m)}};

async function sb(){
  for(let i=0;i<100;i++){
    if(window.allshieldSupabase) return window.allshieldSupabase;
    await new Promise(r=>setTimeout(r,50));
  }
  throw new Error("Supabase is not initialized.");
}

async function me(){
  const c=await sb();
  const {data,error}=await c.auth.getUser();
  if(error) throw error;
  return data.user;
}

async function invoke(name,body){
  const c=await sb();
  const {data,error}=await c.functions.invoke(name,{body});
  if(error) throw error;
  if(data?.error) throw new Error(data.error);
  return data;
}

function cleanLoginLabels(){
  $$('[data-backend-status]').forEach(el=>{
    if(window.allshieldSupabase){el.textContent='Supabase connected';el.classList.add('live');}
  });
}

// ---------- Agent profile: real Supabase persistence ----------
window.loadProfile=async function(){
  try{
    const c=await sb(), u=await me();
    const {data,error}=await c.from('profiles')
      .select('first_name,last_name,phone,resident_state')
      .eq('id',u.id).single();
    if(error) throw error;
    const vals={First:data?.first_name||'',Last:data?.last_name||'',Phone:data?.phone||'',State:data?.resident_state||''};
    Object.entries(vals).forEach(([k,v])=>{const el=document.getElementById('pf'+k); if(el) el.value=v;});
  }catch(e){console.error(e);toastMsg('Unable to load profile: '+(e.message||e));}
};

window.saveProfile=async function(){
  try{
    const c=await sb(), u=await me();
    const patch={
      first_name:document.getElementById('pfFirst')?.value.trim()||null,
      last_name:document.getElementById('pfLast')?.value.trim()||null,
      phone:document.getElementById('pfPhone')?.value.trim()||null,
      resident_state:(document.getElementById('pfState')?.value.trim()||'').slice(0,2).toUpperCase()||null,
      updated_at:new Date().toISOString()
    };
    const {error}=await c.from('profiles').update(patch).eq('id',u.id);
    if(error) throw error;
    toastMsg('Profile saved.');
  }catch(e){console.error(e);toastMsg('Profile save failed: '+(e.message||e));}
};

// ---------- Agent onboarding: real progress ----------
window.loadChecklist=async function(){
  try{
    const c=await sb(),u=await me();
    const {data,error}=await c.from('onboarding_progress').select('step_key,completed').eq('user_id',u.id);
    if(error) throw error;
    const map=Object.fromEntries((data||[]).map(x=>[x.step_key,!!x.completed]));
    setTimeout(()=>$$('[data-ob]').forEach(el=>{el.checked=!!map[el.dataset.ob];}),0);
  }catch(e){console.error(e);}
};

window.saveChecklist=async function(){
  try{
    const c=await sb(),u=await me();
    const items=$$('[data-ob]').map((el,i)=>({
      user_id:u.id,step_key:el.dataset.ob,step_order:i+1,completed:!!el.checked,
      completed_at:el.checked?new Date().toISOString():null,metadata:{}
    }));
    if(!items.length) return toastMsg('No onboarding steps are on this page.');
    const {error}=await c.from('onboarding_progress').upsert(items,{onConflict:'user_id,step_key'});
    if(error) throw error;
    toastMsg('Onboarding progress saved.');
  }catch(e){console.error(e);toastMsg('Onboarding save failed: '+(e.message||e));}
};

// ---------- E-sign: real signature record ----------
window.saveSig=async function(){
  try{
    const c=await sb(),u=await me();
    const {data:doc,error:de}=await c.from('document_templates')
      .select('id,title').eq('status','published').eq('requires_signature',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
    if(de) throw de;
    if(!doc) throw new Error('No published signature document is configured.');
    const canvas=document.getElementById('sigCanvas');
    const signature_payload=canvas?.toDataURL?canvas.toDataURL('image/png'):null;
    const {data:p}=await c.from('profiles').select('first_name,last_name').eq('id',u.id).single();
    const typed_name=[p?.first_name,p?.last_name].filter(Boolean).join(' ');
    const {error}=await c.from('document_signatures').upsert({
      document_id:doc.id,user_id:u.id,typed_name,signature_payload,acknowledged:true,signed_at:new Date().toISOString()
    },{onConflict:'document_id,user_id'});
    if(error) throw error;
    toastMsg('Signature saved securely.');
  }catch(e){console.error(e);toastMsg('Signature save failed: '+(e.message||e));}
};

// ---------- Course builder: real draft course ----------
window.createCourse=async function(){
  const title=document.getElementById('courseTitle')?.value.trim();
  const body=document.getElementById('courseBody')?.value.trim()||'';
  if(!title) return toastMsg('Enter a module title first.');
  try{
    const c=await sb(),u=await me();
    const {data:course,error}=await c.from('courses').insert({title,category:'internal',version:1,status:'draft',created_by:u.id}).select('id').single();
    if(error) throw error;
    const {error:me}=await c.from('course_modules').insert({course_id:course.id,module_order:1,title,body});
    if(me) throw me;
    document.getElementById('courseTitle').value='';
    document.getElementById('courseBody').value='';
    toastMsg('Draft course created in Supabase.');
  }catch(e){console.error(e);toastMsg('Course creation failed: '+(e.message||e));}
};

async function renderAgentProduction(main){
  if(main.dataset.prodLive==='1') return; main.dataset.prodLive='1';
  try{
    const c=await sb(),u=await me();
    const [en,comp,exam]=await Promise.all([
      c.from('campaign_enrollments').select('id,status,created_at').eq('agent_id',u.id),
      c.from('comp_ledger').select('amount,status,payable_on').eq('user_id',u.id),
      c.from('exam_attempts').select('score_percent,created_at').eq('user_id',u.id)
    ]);
    [en,comp,exam].forEach(x=>{if(x.error) throw x.error});
    const enroll=en.data||[], ledger=comp.data||[], exams=exam.data||[];
    const earned=ledger.reduce((n,x)=>n+Number(x.amount||0),0);
    const avg=exams.length?Math.round(exams.reduce((n,x)=>n+Number(x.score_percent||0),0)/exams.length):null;
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">PRODUCTION</div><h2>Your live performance.</h2><p>Current production, earnings and exam activity from Allshield records.</p></div></div>
    <div class="real-data-banner">LIVE SUPABASE DATA</div>
    <div class="stat-grid" style="margin-top:18px">
      <div class="stat"><div class="label">ENROLLMENTS</div><div class="value">${enroll.length}</div></div>
      <div class="stat"><div class="label">LEDGER ENTRIES</div><div class="value">${ledger.length}</div></div>
      <div class="stat"><div class="label">RECORDED EARNINGS</div><div class="value">$${earned.toFixed(2)}</div></div>
      <div class="stat"><div class="label">AVG EXAM SCORE</div><div class="value">${avg===null?'—':avg+'%'}</div></div>
    </div>`;
  }catch(e){main.innerHTML=`<div class="bo-card">LIVE DATA ERROR: ${esc(e.message||e)}</div>`;}
}

async function renderAdminProduction(main){
  if(main.dataset.prodLive==='1') return; main.dataset.prodLive='1';
  try{
    const c=await sb();
    const [profiles,en,comp]=await Promise.all([
      c.from('profiles').select('id,role,status'),
      c.from('campaign_enrollments').select('id,status,agent_id'),
      c.from('comp_ledger').select('amount,status,user_id')
    ]);
    [profiles,en,comp].forEach(x=>{if(x.error) throw x.error});
    const p=profiles.data||[], enroll=en.data||[], ledger=comp.data||[];
    const agents=p.filter(x=>x.role==='agent'&&x.status==='active').length;
    const gross=ledger.reduce((n,x)=>n+Number(x.amount||0),0);
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">PRODUCTION</div><h2>Agency performance.</h2><p>Live production and compensation rollup.</p></div></div>
    <div class="real-data-banner">LIVE SUPABASE DATA</div><div class="stat-grid" style="margin-top:18px">
    <div class="stat"><div class="label">ACTIVE AGENTS</div><div class="value">${agents}</div></div>
    <div class="stat"><div class="label">ENROLLMENTS</div><div class="value">${enroll.length}</div></div>
    <div class="stat"><div class="label">LEDGER ENTRIES</div><div class="value">${ledger.length}</div></div>
    <div class="stat"><div class="label">RECORDED GROSS</div><div class="value">$${gross.toFixed(2)}</div></div></div>`;
  }catch(e){main.innerHTML=`<div class="bo-card">LIVE DATA ERROR: ${esc(e.message||e)}</div>`;}
}

async function renderMeetings(main,canEdit){
  main.dataset.meetLive='1';
  const c=await sb(),u=await me();
  const reload=()=>{delete main.dataset.meetLive;return renderMeetings(main,canEdit);};
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">MEETING GOVERNANCE</div><h2>Company meeting center.</h2><p>Schedule, update, complete and cancel real company meetings.</p></div><button id="meetRefresh" class="tiny-btn">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  ${canEdit?`<div class="bo-card" style="margin-top:18px"><h3>Schedule Meeting</h3><div class="form-grid"><div><label>Title</label><input id="prodMeetingTitle" class="mini-input"></div><div><label>Start</label><input id="prodMeetingStart" type="datetime-local" class="mini-input"></div><div><label>End</label><input id="prodMeetingEnd" type="datetime-local" class="mini-input"></div><div><label>Audience</label><select id="prodMeetingAudience" class="mini-input"><option value="all">All</option><option value="agents">Agents</option><option value="leadership">Leadership</option></select></div><div><label>Location</label><input id="prodMeetingLocation" class="mini-input" placeholder="Zoom / Office / Training Room"></div><div><label>Meeting URL</label><input id="prodMeetingUrl" class="mini-input" placeholder="https://..."></div></div><textarea id="prodMeetingDescription" class="mini-input" style="height:90px;margin-top:10px" placeholder="Description / agenda"></textarea><button id="prodMeetingSave" class="btn btn-primary" style="margin-top:10px">Schedule Meeting</button></div>`:''}
  <div class="bo-card" style="margin-top:18px"><h3>Meetings</h3><div id="prodMeetingList">Loading...</div></div>`;
  $('#meetRefresh',main).onclick=reload;
  if(canEdit) $('#prodMeetingSave',main).onclick=async()=>{try{const title=$('#prodMeetingTitle',main).value.trim(),starts=$('#prodMeetingStart',main).value;if(!title||!starts)throw new Error('Title and start time are required.');const ends=$('#prodMeetingEnd',main).value;const payload={title,description:$('#prodMeetingDescription',main).value.trim()||null,starts_at:new Date(starts).toISOString(),ends_at:ends?new Date(ends).toISOString():null,location:$('#prodMeetingLocation',main).value.trim()||null,meeting_url:$('#prodMeetingUrl',main).value.trim()||null,audience:$('#prodMeetingAudience',main).value,status:'scheduled',created_by:u.id};const {error}=await c.from('company_meetings').insert(payload);if(error)throw error;toastMsg('Meeting scheduled.');await reload();}catch(e){toastMsg('Meeting save failed: '+(e.message||e));}};
  const {data,error}=await c.from('company_meetings').select('*').order('starts_at',{ascending:true}).limit(100);if(error)throw error;
  $('#prodMeetingList',main).innerHTML=(data||[]).map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${new Date(x.starts_at).toLocaleString()} • ${esc(x.audience)} • ${esc(x.status)}${x.location?' • '+esc(x.location):''}</small>${x.description?`<small style="display:block;margin-top:4px">${esc(x.description)}</small>`:''}</span><span class="team-actions">${x.meeting_url?`<a class="tiny-btn" href="${esc(x.meeting_url)}" target="_blank" rel="noopener">Join</a>`:''}${canEdit&&x.status==='scheduled'?`<button class="tiny-btn" data-meet-complete="${x.id}">Complete</button><button class="tiny-btn" data-meet-cancel="${x.id}">Cancel</button>`:''}${canEdit?`<button class="tiny-btn" data-meet-delete="${x.id}">Delete</button>`:''}</span></div>`).join('')||'<div style="opacity:.7">No meetings scheduled.</div>';
  $$('[data-meet-complete]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('company_meetings').update({status:'completed',updated_at:new Date().toISOString()}).eq('id',b.dataset.meetComplete);if(error)return toastMsg(error.message);reload();});
  $$('[data-meet-cancel]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Cancel this meeting?'))return;const {error}=await c.from('company_meetings').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',b.dataset.meetCancel);if(error)return toastMsg(error.message);reload();});
  $$('[data-meet-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Permanently delete this meeting record?'))return;const {error}=await c.from('company_meetings').delete().eq('id',b.dataset.meetDelete);if(error)return toastMsg(error.message);reload();});
}

async function renderSettings(main,ownerMode){
  if(main.dataset.settingsLive==='1') return; main.dataset.settingsLive='1';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">${ownerMode?'GLOBAL':'SYSTEM'} SETTINGS</div><h2>Platform configuration.</h2><p>Settings stored in Supabase.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  <div class="bo-card" style="margin-top:18px"><div class="form-grid"><div><label>Company Display Name</label><input id="prodCompanyName" class="mini-input"></div><div><label>Default Passing Score</label><input id="prodPassingScore" class="mini-input" type="number" min="0" max="100"></div><div><label>Support Email</label><input id="prodSupportEmail" class="mini-input" type="email"></div><div><label>Quarterly Review Days</label><input id="prodReviewDays" class="mini-input" type="number" min="1"></div></div><button id="prodSettingsSave" class="btn btn-primary">Save Settings</button></div>`;
  const c=await sb();
  const {data}=await c.from('company_settings').select('setting_key,setting_value');
  const map=Object.fromEntries((data||[]).map(x=>[x.setting_key,x.setting_value?.value??x.setting_value]));
  $('#prodCompanyName',main).value=map.company_display_name||'Allshield Insurance Group';
  $('#prodPassingScore',main).value=map.default_passing_score??85;
  $('#prodSupportEmail',main).value=map.support_email||'';
  $('#prodReviewDays',main).value=map.quarterly_review_days??90;
  $('#prodSettingsSave',main).addEventListener('click',async()=>{
    try{const u=await me(); const rows=[['company_display_name',$('#prodCompanyName',main).value.trim()],['default_passing_score',Number($('#prodPassingScore',main).value||85)],['support_email',$('#prodSupportEmail',main).value.trim()],['quarterly_review_days',Number($('#prodReviewDays',main).value||90)]].map(([setting_key,value])=>({setting_key,setting_value:{value},updated_by:u.id,updated_at:new Date().toISOString()})); const {error}=await c.from('company_settings').upsert(rows,{onConflict:'setting_key'}); if(error) throw error; toastMsg('Settings saved.');}catch(e){toastMsg('Settings save failed: '+(e.message||e));}
  });
}

async function renderCommunications(main){
  main.dataset.commLive='1';
  const c=await sb(),u=await me(); let editing=null;
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">COMPANY COMMUNICATIONS</div><h2>Company announcement center.</h2><p>Create, edit, publish and archive internal communications.</p></div><button id="commRefresh" class="tiny-btn">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  <div class="bo-card" style="margin-top:18px"><input id="prodCommTitle" class="mini-input" placeholder="Announcement title"><textarea id="prodCommBody" class="mini-input" style="height:130px;margin-top:10px" placeholder="Message"></textarea><div class="form-grid" style="margin-top:10px"><div><label>Audience</label><select id="prodCommAudience" class="mini-input"><option value="all">All</option><option value="agents">Agents</option><option value="leadership">Leadership</option></select></div><div><label>Publish At (optional)</label><input id="prodCommPublishAt" type="datetime-local" class="mini-input"></div></div><div class="row-actions"><button id="prodCommClear" class="tiny-btn">Clear</button><button id="prodCommDraft" class="tiny-btn">Save Draft</button><button id="prodCommPublish" class="btn btn-primary">Publish Now</button></div><div id="prodCommMode" style="font-size:11px;color:#7f93aa;margin-top:8px">Creating a new communication</div></div>
  <div class="bo-card" style="margin-top:18px"><h3>Communication History</h3><div id="prodCommList">Loading...</div></div>`;
  const clear=()=>{editing=null;$('#prodCommTitle',main).value='';$('#prodCommBody',main).value='';$('#prodCommAudience',main).value='all';$('#prodCommPublishAt',main).value='';$('#prodCommMode',main).textContent='Creating a new communication';};
  $('#prodCommClear',main).onclick=clear; $('#commRefresh',main).onclick=()=>{delete main.dataset.commLive;renderCommunications(main);};
  async function save(status){try{const title=$('#prodCommTitle',main).value.trim(),body=$('#prodCommBody',main).value.trim();if(!title||!body)throw new Error('Title and message are required.');const publishAt=$('#prodCommPublishAt',main).value;const payload={title,body,audience:$('#prodCommAudience',main).value,status,publish_at:publishAt?new Date(publishAt).toISOString():null,published_at:status==='published'?new Date().toISOString():null,updated_at:new Date().toISOString()};let q=editing?c.from('company_communications').update(payload).eq('id',editing):c.from('company_communications').insert({...payload,created_by:u.id});const {error}=await q;if(error)throw error;toastMsg(status==='published'?'Communication published.':'Draft saved.');delete main.dataset.commLive;renderCommunications(main);}catch(e){toastMsg('Communication save failed: '+(e.message||e));}}
  $('#prodCommDraft',main).onclick=()=>save('draft');$('#prodCommPublish',main).onclick=()=>save('published');
  const {data,error}=await c.from('company_communications').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;
  $('#prodCommList',main).innerHTML=(data||[]).map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.audience)} • ${esc(x.status)} • ${new Date(x.created_at).toLocaleString()}</small><small style="display:block;margin-top:4px">${esc(x.body.slice(0,180))}${x.body.length>180?'…':''}</small></span><span class="team-actions"><button class="tiny-btn" data-comm-edit="${x.id}">Edit</button>${x.status!=='archived'?`<button class="tiny-btn" data-comm-archive="${x.id}">Archive</button>`:''}<button class="tiny-btn" data-comm-delete="${x.id}">Delete</button></span></div>`).join('')||'<div style="opacity:.7">No communications yet.</div>';
  $$('[data-comm-edit]',main).forEach(b=>b.onclick=()=>{const x=(data||[]).find(r=>r.id===b.dataset.commEdit);if(!x)return;editing=x.id;$('#prodCommTitle',main).value=x.title||'';$('#prodCommBody',main).value=x.body||'';$('#prodCommAudience',main).value=x.audience||'all';$('#prodCommMode',main).textContent='Editing: '+x.title;main.scrollIntoView({behavior:'smooth'});});
  $$('[data-comm-archive]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('company_communications').update({status:'archived',updated_at:new Date().toISOString()}).eq('id',b.dataset.commArchive);if(error)return toastMsg(error.message);delete main.dataset.commLive;renderCommunications(main);});
  $$('[data-comm-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this communication?'))return;const {error}=await c.from('company_communications').delete().eq('id',b.dataset.commDelete);if(error)return toastMsg(error.message);delete main.dataset.commLive;renderCommunications(main);});
}

async function renderMarketing(main){
  main.dataset.marketingLive='1';
  const c=await sb(),u=await me();
  const platforms=['facebook','instagram','linkedin','tiktok','youtube','x','threads','pinterest'];
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">CORPORATE MARKETING CENTER</div><h2>Corporate content workflow.</h2><p>Draft, approve and schedule company content. Social Publishing remains the direct publishing workspace.</p></div><button id="mktRefresh" class="tiny-btn">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE DATA + SECURED AI</div>
  <div class="bo-card" style="margin-top:18px"><textarea id="prodMktText" class="mini-input" style="height:150px" placeholder="Corporate post"></textarea><div style="margin-top:12px"><strong style="font-size:12px">Platforms</strong><div class="publish-toolbar">${platforms.map(x=>`<label class="tiny-btn"><input type="checkbox" data-mkt-platform="${x}" style="margin-right:6px">${x}</label>`).join('')}</div></div><div class="form-grid"><div><label>Schedule For (optional)</label><input id="prodMktSchedule" type="datetime-local" class="mini-input"></div><div><label>Media URL (optional)</label><input id="prodMktMedia" class="mini-input" placeholder="https://..."></div></div><div class="row-actions"><button id="prodMktAI" class="tiny-btn">✦ AI Polish</button><button id="prodMktDraft" class="tiny-btn">Save Draft</button><button id="prodMktApprove" class="btn btn-primary">Approve</button><button id="prodMktScheduleBtn" class="btn btn-primary">Schedule</button></div></div>
  <div class="bo-card" style="margin-top:18px"><h3>Content Queue</h3><div id="prodMktList">Loading...</div></div>`;
  $('#mktRefresh',main).onclick=()=>{delete main.dataset.marketingLive;renderMarketing(main);};
  $('#prodMktAI',main).onclick=async()=>{try{const prompt=$('#prodMktText',main).value.trim();if(!prompt)throw new Error('Enter text first.');const d=await invoke('ai-assistant',{action:'rewrite_social',prompt,style:'polished'});$('#prodMktText',main).value=d.text||prompt;toastMsg('AI polish complete.');}catch(e){toastMsg('AI unavailable: '+(e.message||e));}};
  async function save(status){try{const content=$('#prodMktText',main).value.trim();if(!content)throw new Error('Enter post content first.');const selected=$$('[data-mkt-platform]:checked',main).map(x=>x.dataset.mktPlatform);const sch=$('#prodMktSchedule',main).value;if(status==='scheduled'&&!sch)throw new Error('Choose a schedule time.');const payload={content,platforms:selected,media_url:$('#prodMktMedia',main).value.trim()||null,status,scheduled_for:sch?new Date(sch).toISOString():null,created_by:u.id,approved_by:['approved','scheduled'].includes(status)?u.id:null,updated_at:new Date().toISOString()};const {error}=await c.from('marketing_posts').insert(payload);if(error)throw error;toastMsg(status==='draft'?'Marketing draft saved.':status==='scheduled'?'Post scheduled.':'Post approved.');delete main.dataset.marketingLive;renderMarketing(main);}catch(e){toastMsg('Marketing save failed: '+(e.message||e));}}
  $('#prodMktDraft',main).onclick=()=>save('draft');$('#prodMktApprove',main).onclick=()=>save('approved');$('#prodMktScheduleBtn',main).onclick=()=>save('scheduled');
  const {data,error}=await c.from('marketing_posts').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;
  $('#prodMktList',main).innerHTML=(data||[]).map(x=>`<div class="resource"><span>${esc(x.content.slice(0,150))}${x.content.length>150?'…':''}<small style="display:block">${esc(x.status)} • ${(x.platforms||[]).map(esc).join(', ')||'no platforms'}${x.scheduled_for?' • '+new Date(x.scheduled_for).toLocaleString():''}</small></span><span class="team-actions">${x.status==='draft'?`<button class="tiny-btn" data-mkt-approve="${x.id}">Approve</button>`:''}<button class="tiny-btn" data-mkt-delete="${x.id}">Delete</button></span></div>`).join('')||'<div style="opacity:.7">No marketing posts yet.</div>';
  $$('[data-mkt-approve]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('marketing_posts').update({status:'approved',approved_by:u.id,updated_at:new Date().toISOString()}).eq('id',b.dataset.mktApprove);if(error)return toastMsg(error.message);delete main.dataset.marketingLive;renderMarketing(main);});
  $$('[data-mkt-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this marketing post?'))return;const {error}=await c.from('marketing_posts').delete().eq('id',b.dataset.mktDelete);if(error)return toastMsg(error.message);delete main.dataset.marketingLive;renderMarketing(main);});
}

async function renderMedia(main){
  main.dataset.mediaLive='1';
  const c=await sb(),u=await me();
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">MEDIA STUDIO</div><h2>Controlled company media library.</h2><p>Upload, preview, publish, archive, download and remove company media.</p></div><button id="mediaRefresh" class="tiny-btn">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE STORAGE + DATABASE</div><div class="bo-card" style="margin-top:18px"><div class="form-grid"><div><label>Asset title</label><input id="prodMediaTitle" class="mini-input" placeholder="Asset title"></div><div><label>Audience</label><select id="prodMediaAudience" class="mini-input"><option value="internal">Internal</option><option value="public">Public</option></select></div></div><input id="prodMediaFile" type="file" class="mini-input" style="margin-top:10px"><button id="prodMediaUpload" class="btn btn-primary" style="margin-top:10px">Upload Asset</button></div><div class="bo-card" style="margin-top:18px"><h3>Media Library</h3><div id="prodMediaList">Loading...</div></div>`;
  const reload=()=>{delete main.dataset.mediaLive;return renderMedia(main);}; $('#mediaRefresh',main).onclick=reload;
  $('#prodMediaUpload',main).onclick=async()=>{try{const file=$('#prodMediaFile',main).files?.[0],title=$('#prodMediaTitle',main).value.trim();if(!file||!title)throw new Error('Title and file are required.');const path=`media/${u.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await c.storage.from('allshield-private').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up.error)throw up.error;const {error}=await c.from('media_library').insert({title,storage_path:path,media_type:file.type||null,audience:$('#prodMediaAudience',main).value,status:'draft',created_by:u.id});if(error)throw error;toastMsg('Media uploaded.');reload();}catch(e){toastMsg('Upload failed: '+(e.message||e));}};
  const {data,error}=await c.from('media_library').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;
  $('#prodMediaList',main).innerHTML=(data||[]).map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.media_type||'asset')} • ${esc(x.audience)} • ${esc(x.status)} • ${new Date(x.created_at).toLocaleDateString()}</small></span><span class="team-actions">${x.storage_path?`<button class="tiny-btn" data-media-open="${esc(x.storage_path)}">Open</button>`:''}${x.status==='draft'?`<button class="tiny-btn" data-media-publish="${x.id}">Publish</button>`:''}${x.status!=='archived'?`<button class="tiny-btn" data-media-archive="${x.id}">Archive</button>`:''}<button class="tiny-btn" data-media-delete="${x.id}" data-media-path="${esc(x.storage_path||'')}">Delete</button></span></div>`).join('')||'<div style="opacity:.7">No media uploaded yet.</div>';
  $$('[data-media-open]',main).forEach(b=>b.onclick=async()=>{const {data,error}=await c.storage.from('allshield-private').createSignedUrl(b.dataset.mediaOpen,120);if(error)return toastMsg(error.message);window.open(data.signedUrl,'_blank','noopener');});
  $$('[data-media-publish]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('media_library').update({status:'published',updated_at:new Date().toISOString()}).eq('id',b.dataset.mediaPublish);if(error)return toastMsg(error.message);reload();});
  $$('[data-media-archive]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('media_library').update({status:'archived',updated_at:new Date().toISOString()}).eq('id',b.dataset.mediaArchive);if(error)return toastMsg(error.message);reload();});
  $$('[data-media-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this media asset?'))return;const path=b.dataset.mediaPath;if(path){const rm=await c.storage.from('allshield-private').remove([path]);if(rm.error)return toastMsg(rm.error.message);}const {error}=await c.from('media_library').delete().eq('id',b.dataset.mediaDelete);if(error)return toastMsg(error.message);reload();});
}

async function renderUpdates(main){
  main.dataset.updatesLive='1'; const c=await sb(),u=await me();
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">PLATFORM UPDATE CENTER</div><h2>Controlled release queue.</h2><p>Draft, approve, release or cancel platform changes with an auditable production record.</p></div><button id="updateRefresh" class="tiny-btn">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><div class="form-grid"><div><label>Update title</label><input id="prodUpdateTitle" class="mini-input"></div><div><label>Version label</label><input id="prodUpdateVersion" class="mini-input" placeholder="e.g. B2026.08.26.001"></div></div><textarea id="prodUpdateSummary" class="mini-input" style="height:100px;margin-top:10px" placeholder="Summary"></textarea><button id="prodUpdateSave" class="btn btn-primary" style="margin-top:10px">Create Draft</button></div><div class="bo-card" style="margin-top:18px"><h3>Update Queue</h3><div id="prodUpdateList">Loading...</div></div>`;
  const reload=()=>{delete main.dataset.updatesLive;return renderUpdates(main);};$('#updateRefresh',main).onclick=reload;
  $('#prodUpdateSave',main).onclick=async()=>{try{const title=$('#prodUpdateTitle',main).value.trim();if(!title)throw new Error('Enter an update title.');const {error}=await c.from('platform_updates').insert({title,summary:$('#prodUpdateSummary',main).value.trim()||null,version_label:$('#prodUpdateVersion',main).value.trim()||null,status:'draft',change_payload:{},created_by:u.id});if(error)throw error;toastMsg('Update draft created.');reload();}catch(e){toastMsg('Update draft failed: '+(e.message||e));}};
  const {data,error}=await c.from('platform_updates').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;
  $('#prodUpdateList',main).innerHTML=(data||[]).map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.status)}${x.version_label?' • '+esc(x.version_label):''} • ${new Date(x.created_at).toLocaleString()}</small>${x.summary?`<small style="display:block;margin-top:4px">${esc(x.summary)}</small>`:''}</span><span class="team-actions">${x.status==='draft'?`<button class="tiny-btn" data-up-approve="${x.id}">Approve</button>`:''}${x.status==='approved'?`<button class="btn btn-primary" data-up-release="${x.id}">Release</button>`:''}${!['released','cancelled'].includes(x.status)?`<button class="tiny-btn" data-up-cancel="${x.id}">Cancel</button>`:''}<button class="tiny-btn" data-up-delete="${x.id}">Delete</button></span></div>`).join('')||'<div style="opacity:.7">No update drafts yet.</div>';
  $$('[data-up-approve]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('platform_updates').update({status:'approved',approved_by:u.id}).eq('id',b.dataset.upApprove);if(error)return toastMsg(error.message);reload();});
  $$('[data-up-release]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Mark this approved update as released?'))return;const {error}=await c.from('platform_updates').update({status:'released',released_at:new Date().toISOString(),approved_by:u.id}).eq('id',b.dataset.upRelease);if(error)return toastMsg(error.message);reload();});
  $$('[data-up-cancel]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('platform_updates').update({status:'cancelled'}).eq('id',b.dataset.upCancel);if(error)return toastMsg(error.message);reload();});
  $$('[data-up-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this update record?'))return;const {error}=await c.from('platform_updates').delete().eq('id',b.dataset.upDelete);if(error)return toastMsg(error.message);reload();});
}

async function renderAI(main,role){
  if(main.dataset.aiLive==='1') return; main.dataset.aiLive='1';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">AI COMMAND CENTER</div><h2>Allshield internal AI assistant.</h2><p>Authenticated role-aware assistance through the secured AI service.</p></div></div><div class="real-data-banner">SECURED EDGE FUNCTION</div><div class="bo-card" style="margin-top:18px"><div id="prodAIChat" style="min-height:120px;margin-bottom:12px"></div><textarea id="prodAIPrompt" class="mini-input" style="height:100px" placeholder="Ask Allshield AI..."></textarea><button id="prodAISend" class="btn btn-primary" style="margin-top:10px">Ask</button></div>`;
  $('#prodAISend',main).onclick=async()=>{const p=$('#prodAIPrompt',main).value.trim(); if(!p) return; const chat=$('#prodAIChat',main); chat.innerHTML+=`<div class="ai-msg"><strong>You:</strong> ${esc(p)}</div>`; $('#prodAIPrompt',main).value=''; try{const d=await invoke('ai-assistant',{action:'assist',prompt:p,portal_role:role}); chat.innerHTML+=`<div class="ai-msg"><strong>Allshield AI:</strong> ${esc(d.text||'')}</div>`;}catch(e){chat.innerHTML+=`<div class="ai-msg"><strong>Error:</strong> ${esc(e.message||e)}</div>`;}};
}

function text(main){return (main.textContent||'').replace(/\s+/g,' ').trim();}

async function renderDepartments(main){
  main.dataset.departmentsLive='1'; const c=await sb();
  const [d,p]=await Promise.all([c.from('departments').select('id,name,slug,created_at').order('name'),c.from('profiles').select('id,first_name,last_name,username,email,role,status,department_id')]);if(d.error)throw d.error;if(p.error)throw p.error;const profiles=p.data||[];
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">DEPARTMENTS & ACCESS</div><h2>Department structure and assignments.</h2><p>Create departments, review membership and move team members between departments.</p></div><button id="deptRefresh" class="tiny-btn">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  <div class="bo-card" style="margin-top:18px"><h3>Create Department</h3><div class="form-grid"><input id="deptName" class="mini-input" placeholder="Department name"><input id="deptSlug" class="mini-input" placeholder="department-slug"></div><button id="deptCreate" class="btn btn-primary" style="margin-top:10px">Create Department</button></div>
  <div class="bo-card" style="margin-top:18px"><h3>Departments</h3><table class="admin-table"><tr><th>Department</th><th>Slug</th><th>People</th><th>Active</th><th>Actions</th></tr>${(d.data||[]).map(x=>{const rows=profiles.filter(q=>q.department_id===x.id);return `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.slug)}</td><td>${rows.length}</td><td>${rows.filter(q=>q.status==='active').length}</td><td><button class="tiny-btn" data-dept-delete="${x.id}" data-dept-count="${rows.length}">Delete</button></td></tr>`}).join('')||'<tr><td colspan="5">No departments configured.</td></tr>'}</table></div>
  <div class="bo-card" style="margin-top:18px"><h3>Assign Team Member</h3><div class="form-grid"><select id="deptUser" class="mini-input"><option value="">Choose person</option>${profiles.map(x=>`<option value="${x.id}">${esc([x.first_name,x.last_name].filter(Boolean).join(' ')||x.username||x.email)} • ${esc(x.role)}</option>`).join('')}</select><select id="deptAssign" class="mini-input"><option value="">No Department</option>${(d.data||[]).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div><button id="deptAssignBtn" class="btn btn-primary" style="margin-top:10px">Save Assignment</button></div>`;
  const reload=()=>{delete main.dataset.departmentsLive;return renderDepartments(main);};$('#deptRefresh',main).onclick=reload;
  $('#deptCreate',main).onclick=async()=>{try{const name=$('#deptName',main).value.trim();if(!name)throw new Error('Department name is required.');const slug=($('#deptSlug',main).value.trim()||name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const {error}=await c.from('departments').insert({name,slug});if(error)throw error;toastMsg('Department created.');reload();}catch(e){toastMsg('Department create failed: '+(e.message||e));}};
  $('#deptAssignBtn',main).onclick=async()=>{try{const user_id=$('#deptUser',main).value;if(!user_id)throw new Error('Choose a team member.');await window.allshieldManageTeamUser({action:'update',user_id,department_id:$('#deptAssign',main).value||null});toastMsg('Department assignment saved.');reload();}catch(e){toastMsg('Assignment failed: '+(e.message||e));}};
  $$('[data-dept-delete]',main).forEach(b=>b.onclick=async()=>{if(Number(b.dataset.deptCount)>0)return toastMsg('Move team members out of this department before deleting it.');if(!confirm('Delete this department?'))return;const {error}=await c.from('departments').delete().eq('id',b.dataset.deptDelete);if(error)return toastMsg(error.message);reload();});
}

async function renderVersions(main){
  main.dataset.versionsLive='1'; const c=await sb(),u=await me();
  const {data,error}=await c.from('content_versions').select('*').order('created_at',{ascending:false}).limit(150);if(error)throw error;const rows=data||[];
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">CONTENT VERSIONING</div><h2>Controlled content history.</h2><p>Create, publish, retire and inspect versioned company content.</p></div><button id="verRefresh" class="tiny-btn">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  <div class="bo-card" style="margin-top:18px"><h3>Create Version</h3><div class="form-grid"><input id="verType" class="mini-input" placeholder="Content type, e.g. training"><input id="verKey" class="mini-input" placeholder="Content key, e.g. compliance-101"></div><textarea id="verPayload" class="mini-input" style="height:100px;margin-top:10px" placeholder='JSON payload, e.g. {"title":"..."}'></textarea><textarea id="verNotes" class="mini-input" style="height:70px;margin-top:10px" placeholder="Change notes"></textarea><button id="verCreate" class="btn btn-primary" style="margin-top:10px">Create Next Draft Version</button></div>
  <div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Type</th><th>Key</th><th>Version</th><th>Status</th><th>Created</th><th>Actions</th></tr>${rows.map(x=>`<tr><td>${esc(x.content_type)}</td><td>${esc(x.content_key)}</td><td>V${esc(x.version_number)}</td><td>${esc(x.status)}</td><td>${new Date(x.created_at).toLocaleString()}</td><td><span class="team-actions">${x.status==='draft'?`<button class="tiny-btn" data-ver-publish="${x.id}">Publish</button>`:''}${x.status==='published'?`<button class="tiny-btn" data-ver-retire="${x.id}">Retire</button>`:''}<button class="tiny-btn" data-ver-view="${x.id}">View</button>${x.status==='draft'?`<button class="tiny-btn" data-ver-delete="${x.id}">Delete</button>`:''}</span></td></tr>`).join('')||'<tr><td colspan="6">No content versions recorded yet.</td></tr>'}</table><pre id="verViewer" style="white-space:pre-wrap;margin-top:15px;color:#aebed1"></pre></div>`;
  const reload=()=>{delete main.dataset.versionsLive;return renderVersions(main);};$('#verRefresh',main).onclick=reload;
  $('#verCreate',main).onclick=async()=>{try{const type=$('#verType',main).value.trim(),key=$('#verKey',main).value.trim();if(!type||!key)throw new Error('Content type and key are required.');let payload={};const raw=$('#verPayload',main).value.trim();if(raw)payload=JSON.parse(raw);const latest=rows.filter(x=>x.content_type===type&&x.content_key===key).reduce((m,x)=>Math.max(m,Number(x.version_number||0)),0);const {error}=await c.from('content_versions').insert({content_type:type,content_key:key,version_number:latest+1,status:'draft',payload,change_notes:$('#verNotes',main).value.trim()||null,created_by:u.id});if(error)throw error;toastMsg('Draft version created.');reload();}catch(e){toastMsg('Version create failed: '+(e.message||e));}};
  $$('[data-ver-publish]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('content_versions').update({status:'published',published_at:new Date().toISOString()}).eq('id',b.dataset.verPublish);if(error)return toastMsg(error.message);reload();});
  $$('[data-ver-retire]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('content_versions').update({status:'retired'}).eq('id',b.dataset.verRetire);if(error)return toastMsg(error.message);reload();});
  $$('[data-ver-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this draft version?'))return;const {error}=await c.from('content_versions').delete().eq('id',b.dataset.verDelete);if(error)return toastMsg(error.message);reload();});
  $$('[data-ver-view]',main).forEach(b=>b.onclick=()=>{const x=rows.find(r=>r.id===b.dataset.verView);$('#verViewer',main).textContent=x?JSON.stringify({payload:x.payload,change_notes:x.change_notes},null,2):'';});
}

async function renderCompanyPerformance(main){
  if(main.dataset.companyPerformanceLive==='1') return; main.dataset.companyPerformanceLive='1';
  const c=await sb();
  const [p,e,f,pr]=await Promise.all([
    c.from('profiles').select('id,status,role'),
    c.from('campaign_enrollments').select('id,status,residual_eligible,submitted_at'),
    c.from('finance_transactions').select('direction,amount,reconciled'),
    c.from('payroll_runs').select('status,gross_amount')
  ]);
  [p,e,f,pr].forEach(x=>{if(x.error)throw x.error});
  const profiles=p.data||[], enroll=e.data||[], finance=f.data||[], payroll=pr.data||[];
  const inflow=finance.filter(x=>x.direction==='inflow').reduce((n,x)=>n+Number(x.amount||0),0);
  const outflow=finance.filter(x=>x.direction==='outflow').reduce((n,x)=>n+Number(x.amount||0),0);
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">COMPANY PERFORMANCE</div><h2>Live company operating picture.</h2><p>Production, people and finance indicators from current records.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  <div class="stat-grid" style="margin-top:18px">
    <div class="stat"><div class="label">ACTIVE USERS</div><div class="value">${profiles.filter(x=>x.status==='active').length}</div></div>
    <div class="stat"><div class="label">ENROLLMENT RECORDS</div><div class="value">${enroll.length}</div></div>
    <div class="stat"><div class="label">QUALIFIED / VERIFIED</div><div class="value">${enroll.filter(x=>['qualified','verified'].includes(String(x.status).toLowerCase())||x.residual_eligible).length}</div></div>
    <div class="stat"><div class="label">NET RECORDED CASH FLOW</div><div class="value">$${(inflow-outflow).toLocaleString(undefined,{maximumFractionDigits:2})}</div></div>
  </div>
  <div class="bo-card" style="margin-top:18px"><h3>Payroll</h3><p>${payroll.length?`${payroll.length} payroll run(s) recorded. Total recorded gross: $${payroll.reduce((n,x)=>n+Number(x.gross_amount||0),0).toLocaleString(undefined,{maximumFractionDigits:2})}`:'No payroll runs recorded yet.'}</p></div>`;
}

async function renderVideo(main){
  main.dataset.videoLive='1'; const c=await sb(),u=await me();
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">VIDEO & YOUTUBE STUDIO</div><h2>Company video workspace.</h2><p>Upload, catalog, preview, publish internally and prepare approved video assets for connected channels.</p></div><button id="videoRefresh" class="tiny-btn">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE STORAGE + DATABASE</div>
  <div class="bo-card" style="margin-top:18px"><div class="form-grid"><input id="prodVideoTitle" class="mini-input" placeholder="Video title"><select id="prodVideoAudience" class="mini-input"><option value="internal">Internal</option><option value="public">Public</option></select></div><textarea id="prodVideoDescription" class="mini-input" style="height:80px;margin-top:10px" placeholder="Description"></textarea><input id="prodVideoFile" type="file" accept="video/*" class="mini-input" style="margin-top:10px"><button id="prodVideoUpload" class="btn btn-primary" style="margin-top:10px">Upload Video</button></div>
  <div class="bo-card" style="margin-top:18px"><h3>Video Assets</h3><div id="prodVideoList">Loading...</div></div>`;
  const reload=()=>{delete main.dataset.videoLive;return renderVideo(main);};$('#videoRefresh',main).onclick=reload;
  $('#prodVideoUpload',main).onclick=async()=>{try{const file=$('#prodVideoFile',main).files?.[0],title=$('#prodVideoTitle',main).value.trim();if(!file||!title)throw new Error('Title and video file are required.');const path=`video/${u.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await c.storage.from('allshield-private').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up.error)throw up.error;const {error}=await c.from('media_library').insert({title,description:$('#prodVideoDescription',main).value.trim()||null,storage_path:path,media_type:file.type||'video',audience:$('#prodVideoAudience',main).value,status:'draft',created_by:u.id,metadata:{source:'video-studio'}});if(error)throw error;toastMsg('Video uploaded.');reload();}catch(e){toastMsg('Video upload failed: '+(e.message||e));}};
  const {data,error}=await c.from('media_library').select('*').order('created_at',{ascending:false}).limit(150);if(error)throw error;const vids=(data||[]).filter(x=>String(x.media_type||'').toLowerCase().includes('video'));
  $('#prodVideoList',main).innerHTML=vids.map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.status)} • ${esc(x.audience)} • ${esc(x.media_type||'video')}</small>${x.description?`<small style="display:block;margin-top:4px">${esc(x.description)}</small>`:''}</span><span class="team-actions"><button class="tiny-btn" data-video-open="${esc(x.storage_path||'')}">Preview</button>${x.status==='draft'?`<button class="tiny-btn" data-video-publish="${x.id}">Publish</button>`:''}<button class="tiny-btn" data-video-delete="${x.id}" data-video-path="${esc(x.storage_path||'')}">Delete</button></span></div>`).join('')||'<div style="opacity:.7">No video assets uploaded yet.</div>';
  $$('[data-video-open]',main).forEach(b=>b.onclick=async()=>{const {data,error}=await c.storage.from('allshield-private').createSignedUrl(b.dataset.videoOpen,120);if(error)return toastMsg(error.message);window.open(data.signedUrl,'_blank','noopener');});
  $$('[data-video-publish]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('media_library').update({status:'published',updated_at:new Date().toISOString()}).eq('id',b.dataset.videoPublish);if(error)return toastMsg(error.message);reload();});
  $$('[data-video-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this video asset?'))return;const path=b.dataset.videoPath;if(path){const rm=await c.storage.from('allshield-private').remove([path]);if(rm.error)return toastMsg(rm.error.message);}const {error}=await c.from('media_library').delete().eq('id',b.dataset.videoDelete);if(error)return toastMsg(error.message);reload();});
}

async function renderBrand(main){
  main.dataset.brandLive='1'; const c=await sb(),u=await me();
  const {data,error}=await c.from('social_brand_profiles').select('*').eq('profile_key','allshield_primary').maybeSingle();if(error)throw error;const x=data||{};
  const arr=v=>Array.isArray(v)?v.join('\n'):'';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">BRAND CENTER</div><h2>Official Allshield brand control.</h2><p>The homepage shield and wordmark are the approved production identity. Edit the live company brand profile here.</p></div><button id="brandRefresh" class="tiny-btn">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE BRAND PROFILE • APPROVED HOMEPAGE LOGO</div>
  <div class="bo-card" style="margin-top:18px;background:linear-gradient(135deg,#0c2744,#081421);display:grid;grid-template-columns:180px 1fr;gap:28px;align-items:center"><div style="text-align:center"><img src="assets/brand-9aa0ec99b3b0.webp" alt="Approved Allshield shield" style="max-width:150px;width:100%"></div><div><img src="assets/brand-6553d9469f9e.webp" alt="Allshield Insurance Group" style="max-width:520px;width:100%"><p style="color:#aebed1">Protection • Guidance • Legacy</p></div></div>
  <div class="bo-grid" style="margin-top:18px"><div class="bo-card"><h3>Approved Brand Assets</h3><div class="resource"><span><strong>Shield</strong><small style="display:block">Production homepage shield</small></span><a class="tiny-btn" href="assets/brand-9aa0ec99b3b0.webp" download>Download</a></div><div class="resource"><span><strong>Wordmark</strong><small style="display:block">Production company wordmark</small></span><a class="tiny-btn" href="assets/brand-6553d9469f9e.webp" download>Download</a></div></div><div class="bo-card"><h3>Brand Colors</h3><div class="resource"><span>Allshield Navy</span><code>#0A1E3A</code></div><div class="resource"><span>Allshield Blue</span><code>#0D6EFD</code></div><div class="resource"><span>Light Blue</span><code>#38BDF8</code></div><div class="resource"><span>White</span><code>#FFFFFF</code></div></div></div>
  <div class="bo-card" style="margin-top:18px"><h3>Company Brand Profile</h3><div class="form-grid"><div><label>Company Name</label><input id="brandCompany" class="mini-input" value="${esc(x.company_name||'Allshield Insurance Group')}"></div><div><label>Website</label><input id="brandWebsite" class="mini-input" value="${esc(x.website_url||'')}"></div><div><label>Default CTA</label><input id="brandCTA" class="mini-input" value="${esc(x.default_cta||'')}"></div><div><label>Status</label><select id="brandStatus" class="mini-input"><option value="draft" ${x.status==='draft'?'selected':''}>Draft</option><option value="approved" ${x.status==='approved'?'selected':''}>Approved</option></select></div></div><label>Brand Voice</label><textarea id="brandVoice" class="mini-input" style="height:90px">${esc(x.brand_voice||'')}</textarea><label>Mission</label><textarea id="brandMission" class="mini-input" style="height:90px">${esc(x.mission||'')}</textarea><label>Recruiting Message</label><textarea id="brandRecruit" class="mini-input" style="height:90px">${esc(x.recruiting_message||'')}</textarea><div class="form-grid"><div><label>Services (one per line)</label><textarea id="brandServices" class="mini-input" style="height:120px">${esc(arr(x.services))}</textarea></div><div><label>Service Areas (one per line)</label><textarea id="brandAreas" class="mini-input" style="height:120px">${esc(arr(x.service_areas))}</textarea></div><div><label>Target Audiences (one per line)</label><textarea id="brandAudiences" class="mini-input" style="height:120px">${esc(arr(x.target_audiences))}</textarea></div><div><label>Prohibited Claims / Wording (one per line)</label><textarea id="brandProhibited" class="mini-input" style="height:120px">${esc(arr(x.prohibited_claims))}</textarea></div></div><div class="row-actions"><button id="brandSave" class="tiny-btn">Save Brand Facts</button><button id="brandApprove" class="btn btn-primary">Approve Brand</button></div></div>`;
  const reload=()=>{delete main.dataset.brandLive;return renderBrand(main);};$('#brandRefresh',main).onclick=reload;
  const lines=id=>$('#'+id,main).value.split(/\n+/).map(v=>v.trim()).filter(Boolean);
  async function save(status){try{const payload={profile_key:'allshield_primary',company_name:$('#brandCompany',main).value.trim()||'Allshield Insurance Group',website_url:$('#brandWebsite',main).value.trim()||null,default_cta:$('#brandCTA',main).value.trim()||null,brand_voice:$('#brandVoice',main).value.trim()||null,mission:$('#brandMission',main).value.trim()||null,recruiting_message:$('#brandRecruit',main).value.trim()||null,services:lines('brandServices'),service_areas:lines('brandAreas'),target_audiences:lines('brandAudiences'),prohibited_claims:lines('brandProhibited'),status,updated_by:u.id,updated_at:new Date().toISOString(),approved_by:status==='approved'?u.id:null,approved_at:status==='approved'?new Date().toISOString():null};const {error}=await c.from('social_brand_profiles').upsert(payload,{onConflict:'profile_key'});if(error)throw error;toastMsg(status==='approved'?'Brand approved.':'Brand facts saved.');reload();}catch(e){toastMsg('Brand save failed: '+(e.message||e));}}
  $('#brandSave',main).onclick=()=>save($('#brandStatus',main).value||'draft');$('#brandApprove',main).onclick=()=>save('approved');
}

async function renderOwnerFiles(main){
  if(main.dataset.ownerFilesLive==='1') return; main.dataset.ownerFilesLive='1';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">OWNER FILE VAULT</div><h2>Your controlled company asset library.</h2><p>Private owner-only files stored in Supabase Storage.</p></div></div><div class="real-data-banner">PRIVATE SUPABASE STORAGE • OWNER ONLY</div>
  <div class="bo-card" style="margin-top:18px"><input id="ownerVaultFile" type="file" class="mini-input"><button id="ownerVaultUpload" class="btn btn-primary" style="margin-top:10px">Upload File</button></div>
  <div class="bo-card" style="margin-top:18px"><h3>Owner Files</h3><div id="ownerVaultList">Loading...</div></div>`;
  const c=await sb();
  async function list(){
    const {data,error}=await c.storage.from('owner-vault').list('',{limit:100,sortBy:{column:'created_at',order:'desc'}});if(error)throw error;
    $('#ownerVaultList',main).innerHTML=(data||[]).filter(x=>x.name!=='.emptyFolderPlaceholder').map(f=>`<div class="resource"><span><strong>${esc(f.name)}</strong><small style="display:block">${f.metadata?.size?Math.round(f.metadata.size/1024)+' KB':'file'}</small></span><span class="team-actions"><button class="tiny-btn" data-vault-download="${esc(f.name)}">Download</button><button class="tiny-btn" data-vault-delete="${esc(f.name)}">Delete</button></span></div>`).join('')||'<div style="opacity:.7">No owner files uploaded yet.</div>';
    $$('[data-vault-download]',main).forEach(b=>b.onclick=async()=>{const {data,error}=await c.storage.from('owner-vault').createSignedUrl(b.dataset.vaultDownload,60);if(error)return toastMsg(error.message);window.open(data.signedUrl,'_blank','noopener');});
    $$('[data-vault-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm(`Delete ${b.dataset.vaultDelete}?`))return;const {error}=await c.storage.from('owner-vault').remove([b.dataset.vaultDelete]);if(error)return toastMsg(error.message);await list();});
  }
  $('#ownerVaultUpload',main).onclick=async()=>{try{const file=$('#ownerVaultFile',main).files?.[0];if(!file)throw new Error('Choose a file first.');const name=`${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const {error}=await c.storage.from('owner-vault').upload(name,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;toastMsg('File uploaded.');$('#ownerVaultFile',main).value='';await list();}catch(e){toastMsg('Upload failed: '+(e.message||e));}};
  await list();
}

async function renderAudit(main){
  if(main.dataset.auditLive==='1') return; main.dataset.auditLive='1';
  const c=await sb();
  const {data,error}=await c.from('audit_log').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">AUDIT & CHANGE HISTORY</div><h2>Live system audit trail.</h2><p>Recorded actions from production data.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Time</th><th>Action</th><th>Object</th><th>Details</th></tr>${(data||[]).map(x=>`<tr><td>${new Date(x.created_at).toLocaleString()}</td><td>${esc(x.action)}</td><td>${esc(x.object_type||'—')}</td><td>${esc(JSON.stringify(x.details||{}).slice(0,160))}</td></tr>`).join('')||'<tr><td colspan="4">No audit events recorded yet.</td></tr>'}</table></div>`;
}

async function renderBuildHistory(main){
  if(main.dataset.buildHistoryLive==='1') return; main.dataset.buildHistoryLive='1';
  const c=await sb();
  const {data,error}=await c.from('build_history').select('*').order('released_at',{ascending:false}).limit(100);if(error)throw error;
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">BUILD & RELEASE CONTROL</div><h2>Production build history.</h2><p>Recorded releases from the live build history table.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Build</th><th>Label</th><th>Channel</th><th>Released</th></tr>${(data||[]).map(x=>`<tr><td><strong>${esc(x.build_number)}</strong></td><td>${esc(x.label)}</td><td>${esc(x.channel)}</td><td>${new Date(x.released_at).toLocaleString()}</td></tr>`).join('')||'<tr><td colspan="4">No build history recorded yet.</td></tr>'}</table></div>`;
}

async function renderLeaderboard(main){
  if(main.dataset.leaderboardLive==='1') return; main.dataset.leaderboardLive='1';
  const c=await sb();
  const [p,e,l]=await Promise.all([
    c.from('profiles').select('id,first_name,last_name,username,email,status,role'),
    c.from('campaign_enrollments').select('agent_id,status,residual_eligible'),
    c.from('comp_ledger').select('user_id,amount,status')
  ]);
  [p,e,l].forEach(x=>{if(x.error)throw x.error});
  const people=(p.data||[]).filter(x=>['agent','team_lead','manager'].includes(x.role)&&x.status!=='terminated');
  const enroll=e.data||[], ledger=l.data||[];
  const rows=people.map(x=>{const mine=enroll.filter(y=>y.agent_id===x.id),pay=ledger.filter(y=>y.user_id===x.id);return {name:[x.first_name,x.last_name].filter(Boolean).join(' ')||x.username||x.email||'Unnamed',total:mine.length,qualified:mine.filter(y=>y.residual_eligible||String(y.status).toLowerCase()==='qualified').length,earnings:pay.reduce((n,y)=>n+Number(y.amount||0),0)}}).sort((a,b)=>b.qualified-a.qualified||b.total-a.total);
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">RANKINGS & BONUSES</div><h2>Live production standings.</h2><p>Rankings use recorded enrollments and compensation ledger entries only.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>#</th><th>Agent</th><th>Records</th><th>Qualified</th><th>Recorded Earnings</th></tr>${rows.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td>${x.total}</td><td>${x.qualified}</td><td>$${x.earnings.toLocaleString(undefined,{maximumFractionDigits:2})}</td></tr>`).join('')||'<tr><td colspan="5">No production records yet.</td></tr>'}</table></div>`;
}

async function renderAutomation(main){
  if(main.dataset.automationLive==='1') return; main.dataset.automationLive='1';
  const c=await sb();
  const [mail,ai,cur,social]=await Promise.all([
    c.from('mail_sync_runs').select('status,started_at,completed_at,error_text').order('started_at',{ascending:false}).limit(5),
    c.from('ai_employee_runs').select('run_type,status,created_at,error_text').order('created_at',{ascending:false}).limit(5),
    c.from('curriculum_monitor_runs').select('run_type,status,created_at,error_text').order('created_at',{ascending:false}).limit(5),
    c.from('social_publish_jobs').select('platform,status,created_at,error_message').order('created_at',{ascending:false}).limit(5)
  ]);
  [mail,ai,cur,social].forEach(x=>{if(x.error)throw x.error});
  const block=(title,rows,map)=>`<div class="bo-card"><h3>${title}</h3>${rows.length?rows.map(map).join(''):'<p style="opacity:.7">No runs recorded yet.</p>'}</div>`;
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">AUTOMATION CENTER</div><h2>Live automation activity.</h2><p>Current system jobs and recent run status. No simulated automations are shown.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-grid" style="margin-top:18px">
  ${block('Mail Sync',mail.data||[],x=>`<div class="resource"><span>${new Date(x.started_at).toLocaleString()}</span><span class="pill">${esc(x.status)}</span></div>`)}
  ${block('AI Employee Runs',ai.data||[],x=>`<div class="resource"><span>${esc(x.run_type)}</span><span class="pill">${esc(x.status)}</span></div>`)}
  ${block('Curriculum Monitor',cur.data||[],x=>`<div class="resource"><span>${esc(x.run_type)}</span><span class="pill">${esc(x.status)}</span></div>`)}
  ${block('Social Jobs',social.data||[],x=>`<div class="resource"><span>${esc(x.platform)}</span><span class="pill">${esc(x.status)}</span></div>`)}
  </div>`;
}

async function renderCareerPath(main){
  if(main.dataset.careerPathLive==='1') return; main.dataset.careerPathLive='1';
  const c=await sb(),u=await me();
  const [levels,promos,snaps]=await Promise.all([
    c.from('promotion_levels').select('*').eq('active',true).order('level_order'),
    c.from('user_promotions').select('level_id,status,approved_at,created_at').eq('user_id',u.id).order('created_at',{ascending:false}),
    c.from('promotion_qualification_snapshots').select('*').eq('user_id',u.id).order('qualification_month',{ascending:false}).limit(1)
  ]);
  [levels,promos,snaps].forEach(x=>{if(x.error)throw x.error});
  const lv=levels.data||[], pr=promos.data||[], latest=snaps.data?.[0]||null;
  const current=pr.find(x=>x.status==='approved');
  const currentLevel=current?lv.find(x=>x.id===current.level_id):null;
  const next=currentLevel?lv.find(x=>x.level_order>currentLevel.level_order):lv[0];
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">CAREER PATH</div><h2>Your live promotion roadmap.</h2><p>Promotion levels and qualification records from Supabase.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  <div class="bo-grid" style="margin-top:18px"><div class="bo-card"><h3>Current Level</h3><p>${esc(currentLevel?.name||'No approved promotion level yet')}</p></div><div class="bo-card"><h3>Next Level</h3><p>${esc(next?.name||'Top active level reached')}</p></div></div>
  <div class="bo-card" style="margin-top:18px"><h3>Latest Qualification Snapshot</h3>${latest?`<p>Personal enrollments: ${latest.personal_enrollments}</p><p>First-generation enrollments: ${latest.first_generation_enrollments}</p><p>Active direct agents: ${latest.active_direct_agents}</p><p>Qualifies: ${latest.qualifies?'Yes':'No'}</p>`:'<p>No qualification snapshot has been recorded yet.</p>'}</div>
  <div class="bo-card" style="margin-top:18px"><h3>Active Promotion Levels</h3>${lv.map(x=>`<div class="resource"><span><strong>${esc(x.name)}</strong><small style="display:block">${esc(JSON.stringify(x.requirements||{}))}</small></span><span class="pill">LEVEL ${x.level_order}</span></div>`).join('')||'<p>No promotion levels configured.</p>'}</div>`;
}

function kicker(main){return $('.kicker',main)?.textContent?.trim().toUpperCase()||'';}

async function enhance(main,role){
  if(!main || main.dataset.productionEnhancing==='1') return;
  const k=kicker(main), t=text(main);
  if(/LIVE SUPABASE DATA/.test(t) || /SECURED EDGE FUNCTION/.test(t)) return;
  main.dataset.productionEnhancing='1';
  try{
    if(k==='PRODUCTION') return role==='agent'?renderAgentProduction(main):renderAdminProduction(main);
    if(k==='DEPARTMENTS & ACCESS') return renderDepartments(main);
    if(k==='CONTENT VERSIONING') return renderVersions(main);
    if(k==='COMPANY PERFORMANCE') return renderCompanyPerformance(main);
    if(k==='VIDEO & YOUTUBE STUDIO') return renderVideo(main);
    if(k==='BRAND CENTER') return renderBrand(main);
    if(k==='OWNER FILE VAULT') return renderOwnerFiles(main);
    if(k==='AUDIT & CHANGE HISTORY') return renderAudit(main);
    if(k==='BUILD & RELEASE CONTROL') return renderBuildHistory(main);
    if(k==='RANKINGS & BONUSES') return renderLeaderboard(main);
    if(k==='AUTOMATION CENTER') return renderAutomation(main);
    if(k==='CAREER PATH') return renderCareerPath(main);
    if(/TRAINING ROOM|MEETING ROOM ADMINISTRATION|MEETING GOVERNANCE|MEETINGS & TRAINING/.test(k)) return renderMeetings(main,role!=='agent');
    if(/SYSTEM SETTINGS|GLOBAL SETTINGS/.test(k)) return renderSettings(main,role==='owner');
    if(/COMPANY COMMUNICATIONS/.test(k)) return role==='agent'?undefined:renderCommunications(main);
    if(/CORPORATE MARKETING CENTER|MARKETING CENTER/.test(k)) return renderMarketing(main);
    if(/OWNER MEDIA STUDIO|MEDIA STUDIO/.test(k)) return renderMedia(main);
    if(/PLATFORM UPDATE CENTER/.test(k)) return renderUpdates(main);
    if(/AI COMMAND CENTER/.test(k) || /ASK .* AI/.test(t.toUpperCase())) return renderAI(main,role);
  } finally { main.dataset.productionEnhancing=''; }
}

function enhanceRole(role){
  const id=role==='agent'?'agentMain':role==='admin'?'adminMain':'ownerMain';
  const main=document.getElementById(id);
  if(!main)return;
  Promise.resolve(enhance(main,role)).catch(e=>console.error('Production enhancement failed',role,e));
}

function start(){
  cleanLoginLabels();
  if(typeof window.registerAllshieldView!=='function') return setTimeout(start,60);

  const A=()=>document.getElementById('agentMain');
  const D=()=>document.getElementById('adminMain');
  const O=()=>document.getElementById('ownerMain');

  window.registerAllshieldView('agent','production',()=>renderAgentProduction(A()));
  window.registerAllshieldView('agent','meetings',()=>renderMeetings(A(),false));
  window.registerAllshieldView('agent','careerpath',()=>renderCareerPath(A()));

  window.registerAllshieldView('admin','production',()=>renderAdminProduction(D()));
  window.registerAllshieldView('admin','meetings',()=>renderMeetings(D(),true));
  window.registerAllshieldView('admin','settings',()=>renderSettings(D(),false));
  window.registerAllshieldView('admin','communications',()=>renderCommunications(D()));
  window.registerAllshieldView('admin','marketing',()=>renderMarketing(D()));
  window.registerAllshieldView('admin','leaderboard',()=>renderLeaderboard(D()));
  window.registerAllshieldView('admin','automations',()=>renderAutomation(D()));

  window.registerAllshieldView('owner','departments',()=>renderDepartments(O()));
  window.registerAllshieldView('owner','communications',()=>renderCommunications(O()));
  window.registerAllshieldView('owner','versions',()=>renderVersions(O()));
  window.registerAllshieldView('owner','updates',()=>renderUpdates(O()));
  window.registerAllshieldView('owner','performance',()=>renderCompanyPerformance(O()));
  window.registerAllshieldView('owner','meetings',()=>renderMeetings(O(),true));
  window.registerAllshieldView('owner','marketing',()=>renderMarketing(O()));
  window.registerAllshieldView('owner','video',()=>renderVideo(O()));
  window.registerAllshieldView('owner','media',()=>renderMedia(O()));
  window.registerAllshieldView('owner','brand',()=>renderBrand(O()));
  window.registerAllshieldView('owner','files',()=>renderOwnerFiles(O()));
  window.registerAllshieldView('owner','audit',()=>renderAudit(O()));
  window.registerAllshieldView('owner','buildhistory',()=>renderBuildHistory(O()));
  window.registerAllshieldView('owner','settings',()=>renderSettings(O(),true));

  console.log('Allshield production core canonical views registered',VERSION);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
