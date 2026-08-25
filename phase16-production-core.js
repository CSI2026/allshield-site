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
  if(main.dataset.meetLive==='1') return; main.dataset.meetLive='1';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">MEETINGS</div><h2>Company meeting center.</h2><p>Scheduled rooms, access and join links.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  ${canEdit?`<div class="bo-card" style="margin-top:18px"><h3>Schedule Meeting</h3><div class="form-grid"><div><label>Title</label><input id="prodMeetingTitle" class="mini-input"></div><div><label>Start</label><input id="prodMeetingStart" type="datetime-local" class="mini-input"></div><div><label>Meeting URL</label><input id="prodMeetingUrl" class="mini-input" placeholder="https://..."></div><div><label>Audience</label><select id="prodMeetingAudience" class="mini-input"><option>all</option><option>agents</option><option>leadership</option></select></div></div><button id="prodMeetingSave" class="btn btn-primary">Schedule</button></div>`:''}
  <div class="bo-card" style="margin-top:18px"><h3>Scheduled Meetings</h3><div id="prodMeetingList">Loading...</div></div>`;
  if(canEdit) $('#prodMeetingSave',main)?.addEventListener('click',async()=>{
    try{const c=await sb(),u=await me(); const title=$('#prodMeetingTitle',main).value.trim(), starts=$('#prodMeetingStart',main).value; if(!title||!starts) throw new Error('Title and start time are required.'); const {error}=await c.from('company_meetings').insert({title,starts_at:new Date(starts).toISOString(),meeting_url:$('#prodMeetingUrl',main).value.trim()||null,audience:$('#prodMeetingAudience',main).value,created_by:u.id}); if(error) throw error; toastMsg('Meeting scheduled.'); main.dataset.meetLive=''; renderMeetings(main,canEdit);}catch(e){toastMsg('Meeting save failed: '+(e.message||e));}
  });
  try{const c=await sb(); const {data,error}=await c.from('company_meetings').select('*').neq('status','cancelled').order('starts_at',{ascending:true}).limit(50); if(error) throw error; const rows=data||[]; $('#prodMeetingList',main).innerHTML=rows.length?rows.map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${new Date(x.starts_at).toLocaleString()} • ${esc(x.audience)}</small></span>${x.meeting_url?`<a class="tiny-btn" href="${esc(x.meeting_url)}" target="_blank" rel="noopener">Join</a>`:'<span class="pill">No join URL</span>'}</div>`).join(''):'<div style="opacity:.7">No meetings scheduled.</div>'; }catch(e){$('#prodMeetingList',main).textContent='Unable to load meetings: '+(e.message||e);}
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
  if(main.dataset.commLive==='1') return; main.dataset.commLive='1';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">COMPANY COMMUNICATIONS</div><h2>Publish internal announcements.</h2><p>Draft, publish and archive company communications.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><input id="prodCommTitle" class="mini-input" placeholder="Announcement title"><textarea id="prodCommBody" class="mini-input" style="height:120px;margin-top:10px" placeholder="Message"></textarea><div class="row-actions"><select id="prodCommAudience" class="mini-input"><option>all</option><option>agents</option><option>leadership</option></select><button id="prodCommDraft" class="tiny-btn">Save Draft</button><button id="prodCommPublish" class="btn btn-primary">Publish</button></div></div><div class="bo-card" style="margin-top:18px"><h3>Recent Communications</h3><div id="prodCommList">Loading...</div></div>`;
  const c=await sb(),u=await me();
  async function save(status){const title=$('#prodCommTitle',main).value.trim(),body=$('#prodCommBody',main).value.trim(); if(!title||!body) return toastMsg('Title and message are required.'); const now=new Date().toISOString(); const {error}=await c.from('company_communications').insert({title,body,audience:$('#prodCommAudience',main).value,status,published_at:status==='published'?now:null,created_by:u.id}); if(error) return toastMsg('Save failed: '+error.message); toastMsg(status==='published'?'Communication published.':'Draft saved.'); main.dataset.commLive=''; renderCommunications(main);}
  $('#prodCommDraft',main).onclick=()=>save('draft'); $('#prodCommPublish',main).onclick=()=>save('published');
  const {data,error}=await c.from('company_communications').select('*').order('created_at',{ascending:false}).limit(30); $('#prodCommList',main).innerHTML=error?'Unable to load communications.':(data||[]).map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.audience)} • ${esc(x.status)}</small></span><span class="pill">${new Date(x.created_at).toLocaleDateString()}</span></div>`).join('')||'<div style="opacity:.7">No communications yet.</div>';
}

async function renderMarketing(main){
  if(main.dataset.marketingLive==='1') return; main.dataset.marketingLive='1';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">CORPORATE MARKETING CENTER</div><h2>Corporate content workflow.</h2><p>AI-assisted drafting, approval and scheduling. External publishing activates when company social accounts are connected.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><textarea id="prodMktText" class="mini-input" style="height:150px" placeholder="Corporate post"></textarea><div class="row-actions"><button id="prodMktAI" class="tiny-btn">✦ AI Polish</button><button id="prodMktDraft" class="tiny-btn">Save Draft</button><button id="prodMktApprove" class="btn btn-primary">Approve</button></div></div><div class="bo-card" style="margin-top:18px"><h3>Content Queue</h3><div id="prodMktList">Loading...</div></div>`;
  const c=await sb(),u=await me();
  $('#prodMktAI',main).onclick=async()=>{try{const prompt=$('#prodMktText',main).value.trim(); if(!prompt) throw new Error('Enter text first.'); const d=await invoke('ai-assistant',{action:'rewrite_social',prompt,style:'polished'}); $('#prodMktText',main).value=d.text||prompt; toastMsg('AI polish complete.');}catch(e){toastMsg('AI unavailable: '+(e.message||e));}};
  async function save(status){const content=$('#prodMktText',main).value.trim(); if(!content) return toastMsg('Enter post content first.'); const {error}=await c.from('marketing_posts').insert({content,platforms:[],status,created_by:u.id,approved_by:status==='approved'?u.id:null}); if(error) return toastMsg('Marketing save failed: '+error.message); toastMsg(status==='approved'?'Post approved for connected publisher.':'Marketing draft saved.'); main.dataset.marketingLive=''; renderMarketing(main);}
  $('#prodMktDraft',main).onclick=()=>save('draft'); $('#prodMktApprove',main).onclick=()=>save('approved');
  const {data,error}=await c.from('marketing_posts').select('*').order('created_at',{ascending:false}).limit(30); $('#prodMktList',main).innerHTML=error?'Unable to load queue.':(data||[]).map(x=>`<div class="resource"><span>${esc(x.content.slice(0,110))}${x.content.length>110?'…':''}<small style="display:block">${esc(x.status)}</small></span><span class="pill">${new Date(x.created_at).toLocaleDateString()}</span></div>`).join('')||'<div style="opacity:.7">No marketing posts yet.</div>';
}

async function renderMedia(main){
  if(main.dataset.mediaLive==='1') return; main.dataset.mediaLive='1';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">MEDIA STUDIO</div><h2>Controlled company media library.</h2><p>Upload, catalog and publish internal media assets.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><input id="prodMediaTitle" class="mini-input" placeholder="Asset title"><input id="prodMediaFile" type="file" class="mini-input" style="margin-top:10px"><button id="prodMediaUpload" class="btn btn-primary" style="margin-top:10px">Upload</button></div><div class="bo-card" style="margin-top:18px"><h3>Media Library</h3><div id="prodMediaList">Loading...</div></div>`;
  const c=await sb(),u=await me();
  $('#prodMediaUpload',main).onclick=async()=>{try{const file=$('#prodMediaFile',main).files?.[0],title=$('#prodMediaTitle',main).value.trim(); if(!file||!title) throw new Error('Title and file are required.'); const path=`media/${u.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`; const up=await c.storage.from('allshield-private').upload(path,file,{upsert:false}); if(up.error) throw up.error; const {error}=await c.from('media_library').insert({title,storage_path:path,media_type:file.type||null,status:'draft',created_by:u.id}); if(error) throw error; toastMsg('Media uploaded.'); main.dataset.mediaLive=''; renderMedia(main);}catch(e){toastMsg('Upload failed: '+(e.message||e));}};
  const {data,error}=await c.from('media_library').select('*').order('created_at',{ascending:false}).limit(50); $('#prodMediaList',main).innerHTML=error?'Unable to load media.':(data||[]).map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.media_type||'asset')} • ${esc(x.status)}</small></span><span class="pill">${new Date(x.created_at).toLocaleDateString()}</span></div>`).join('')||'<div style="opacity:.7">No media uploaded yet.</div>';
}

async function renderUpdates(main){
  if(main.dataset.updatesLive==='1') return; main.dataset.updatesLive='1';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">PLATFORM UPDATE CENTER</div><h2>Controlled release queue.</h2><p>Draft, approve and release platform changes with auditability.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><input id="prodUpdateTitle" class="mini-input" placeholder="Update title"><textarea id="prodUpdateSummary" class="mini-input" style="height:100px;margin-top:10px" placeholder="Summary"></textarea><button id="prodUpdateSave" class="btn btn-primary" style="margin-top:10px">Create Draft</button></div><div class="bo-card" style="margin-top:18px"><h3>Update Queue</h3><div id="prodUpdateList">Loading...</div></div>`;
  const c=await sb(),u=await me(); $('#prodUpdateSave',main).onclick=async()=>{const title=$('#prodUpdateTitle',main).value.trim(); if(!title) return toastMsg('Enter an update title.'); const {error}=await c.from('platform_updates').insert({title,summary:$('#prodUpdateSummary',main).value.trim()||null,status:'draft',created_by:u.id}); if(error) return toastMsg('Update draft failed: '+error.message); toastMsg('Update draft created.'); main.dataset.updatesLive=''; renderUpdates(main);}; const {data,error}=await c.from('platform_updates').select('*').order('created_at',{ascending:false}).limit(30); $('#prodUpdateList',main).innerHTML=error?'Unable to load updates.':(data||[]).map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.status)}${x.version_label?' • '+esc(x.version_label):''}</small></span><span class="pill">${new Date(x.created_at).toLocaleDateString()}</span></div>`).join('')||'<div style="opacity:.7">No update drafts yet.</div>';
}

async function renderAI(main,role){
  if(main.dataset.aiLive==='1') return; main.dataset.aiLive='1';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">AI COMMAND CENTER</div><h2>Allshield internal AI assistant.</h2><p>Authenticated role-aware assistance through the secured AI service.</p></div></div><div class="real-data-banner">SECURED EDGE FUNCTION</div><div class="bo-card" style="margin-top:18px"><div id="prodAIChat" style="min-height:120px;margin-bottom:12px"></div><textarea id="prodAIPrompt" class="mini-input" style="height:100px" placeholder="Ask Allshield AI..."></textarea><button id="prodAISend" class="btn btn-primary" style="margin-top:10px">Ask</button></div>`;
  $('#prodAISend',main).onclick=async()=>{const p=$('#prodAIPrompt',main).value.trim(); if(!p) return; const chat=$('#prodAIChat',main); chat.innerHTML+=`<div class="ai-msg"><strong>You:</strong> ${esc(p)}</div>`; $('#prodAIPrompt',main).value=''; try{const d=await invoke('ai-assistant',{action:'assist',prompt:p,portal_role:role}); chat.innerHTML+=`<div class="ai-msg"><strong>Allshield AI:</strong> ${esc(d.text||'')}</div>`;}catch(e){chat.innerHTML+=`<div class="ai-msg"><strong>Error:</strong> ${esc(e.message||e)}</div>`;}};
}

function text(main){return (main.textContent||'').replace(/\s+/g,' ').trim();}

async function renderDepartments(main){
  if(main.dataset.departmentsLive==='1') return; main.dataset.departmentsLive='1';
  const c=await sb();
  const [d,p]=await Promise.all([
    c.from('departments').select('id,name,slug,created_at').order('name'),
    c.from('profiles').select('id,role,status,department_id')
  ]);
  if(d.error) throw d.error; if(p.error) throw p.error;
  const profiles=p.data||[];
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">DEPARTMENTS & ACCESS</div><h2>Live department structure.</h2><p>Current departments and assigned people from Supabase.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  <div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Department</th><th>Slug</th><th>People</th><th>Active</th></tr>${(d.data||[]).map(x=>{const rows=profiles.filter(p=>p.department_id===x.id);return `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.slug)}</td><td>${rows.length}</td><td>${rows.filter(p=>p.status==='active').length}</td></tr>`}).join('')||'<tr><td colspan="4">No departments configured.</td></tr>'}</table></div>`;
}

async function renderVersions(main){
  if(main.dataset.versionsLive==='1') return; main.dataset.versionsLive='1';
  const c=await sb();
  const {data,error}=await c.from('content_versions').select('*').order('created_at',{ascending:false}).limit(100);
  if(error) throw error;
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">CONTENT VERSIONING</div><h2>Published content history.</h2><p>Live version records from the production database.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  <div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Type</th><th>Key</th><th>Version</th><th>Status</th><th>Created</th></tr>${(data||[]).map(x=>`<tr><td>${esc(x.content_type)}</td><td>${esc(x.content_key)}</td><td>V${esc(x.version_number)}</td><td>${esc(x.status)}</td><td>${new Date(x.created_at).toLocaleString()}</td></tr>`).join('')||'<tr><td colspan="5">No content versions recorded yet.</td></tr>'}</table></div>`;
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
  if(main.dataset.videoLive==='1') return; main.dataset.videoLive='1';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">VIDEO & YOUTUBE STUDIO</div><h2>Company video library.</h2><p>Upload and manage video assets. External YouTube publishing will only activate after a provider connection is configured.</p></div></div><div class="real-data-banner">LIVE SUPABASE STORAGE + DATABASE</div>
  <div class="bo-card" style="margin-top:18px"><input id="prodVideoTitle" class="mini-input" placeholder="Video title"><input id="prodVideoFile" type="file" accept="video/*" class="mini-input" style="margin-top:10px"><button id="prodVideoUpload" class="btn btn-primary" style="margin-top:10px">Upload Video</button></div>
  <div class="bo-card" style="margin-top:18px"><h3>Video Assets</h3><div id="prodVideoList">Loading...</div></div>`;
  const c=await sb(),u=await me();
  $('#prodVideoUpload',main).onclick=async()=>{try{const file=$('#prodVideoFile',main).files?.[0],title=$('#prodVideoTitle',main).value.trim();if(!file||!title)throw new Error('Title and video file are required.');const path=`video/${u.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await c.storage.from('allshield-private').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up.error)throw up.error;const {error}=await c.from('media_library').insert({title,storage_path:path,media_type:file.type||'video',status:'draft',created_by:u.id});if(error)throw error;toastMsg('Video uploaded.');main.dataset.videoLive='';renderVideo(main);}catch(e){toastMsg('Video upload failed: '+(e.message||e));}};
  const {data,error}=await c.from('media_library').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;
  const vids=(data||[]).filter(x=>String(x.media_type||'').toLowerCase().includes('video'));
  $('#prodVideoList',main).innerHTML=vids.map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.status)} • ${esc(x.media_type||'video')}</small></span><span class="pill">${new Date(x.created_at).toLocaleDateString()}</span></div>`).join('')||'<div style="opacity:.7">No video assets uploaded yet.</div>';
}

async function renderBrand(main){
  if(main.dataset.brandLive==='1') return; main.dataset.brandLive='1';
  const c=await sb();
  const {data,error}=await c.from('social_brand_profiles').select('*').eq('profile_key','allshield_primary').maybeSingle();
  if(error) throw error;
  const x=data||{};
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">BRAND CENTER</div><h2>Approved Allshield brand profile.</h2><p>The website homepage logo is the production-approved logo. Legacy logo variants are not part of this center.</p></div></div><div class="real-data-banner">LIVE SUPABASE BRAND PROFILE</div>
  <div class="bo-grid" style="margin-top:18px">
    <div class="bo-card"><h3>Company</h3><p><strong>${esc(x.company_name||'Allshield Insurance Group')}</strong></p><p>${esc(x.short_description||'No approved short description saved yet.')}</p></div>
    <div class="bo-card"><h3>Brand Voice</h3><p>${esc(x.brand_voice||'No approved brand voice saved yet.')}</p></div>
    <div class="bo-card"><h3>Default CTA</h3><p>${esc(x.default_cta||'No default CTA saved yet.')}</p></div>
    <div class="bo-card"><h3>Status</h3><p>${esc(x.status||'not configured')}</p></div>
  </div>`;
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
