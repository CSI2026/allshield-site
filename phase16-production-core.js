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
  const c=await sb(),u=await me();
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">MEETINGS</div><h2>Company meeting center.</h2><p>Schedule, edit, complete and cancel company meetings from the live meeting registry.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  ${canEdit?`<div class="bo-card" style="margin-top:18px"><h3>Schedule / Edit Meeting</h3><input id="prodMeetingId" type="hidden"><div class="form-grid"><div><label>Title</label><input id="prodMeetingTitle" class="mini-input"></div><div><label>Meeting Type</label><input id="prodMeetingType" class="mini-input" value="company"></div><div><label>Start</label><input id="prodMeetingStart" type="datetime-local" class="mini-input"></div><div><label>End</label><input id="prodMeetingEnd" type="datetime-local" class="mini-input"></div><div><label>Location</label><input id="prodMeetingLocation" class="mini-input"></div><div><label>Meeting URL</label><input id="prodMeetingUrl" class="mini-input" placeholder="https://..."></div><div><label>Audience</label><select id="prodMeetingAudience" class="mini-input"><option>all</option><option>agents</option><option>leadership</option></select></div><div><label>Status</label><select id="prodMeetingStatus" class="mini-input"><option>scheduled</option><option>completed</option><option>cancelled</option></select></div></div><textarea id="prodMeetingDescription" class="mini-input" style="height:90px;margin-top:10px" placeholder="Agenda / description"></textarea><div class="row-actions"><button id="prodMeetingSave" class="btn btn-primary">Save Meeting</button><button id="prodMeetingClear" class="tiny-btn">Clear</button></div></div>`:''}
  <div class="bo-card" style="margin-top:18px"><h3>Meeting Registry</h3><div id="prodMeetingList">Loading...</div></div>`;
  const refresh=async()=>{
    const {data,error}=await c.from('company_meetings').select('*').order('starts_at',{ascending:false}).limit(100);if(error)throw error;const rows=data||[];
    $('#prodMeetingList',main).innerHTML=rows.length?rows.map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${new Date(x.starts_at).toLocaleString()} • ${esc(x.audience)} • ${esc(x.status)}${x.location?' • '+esc(x.location):''}</small></span><span class="team-actions">${x.meeting_url?`<a class="tiny-btn" href="${esc(x.meeting_url)}" target="_blank" rel="noopener">Join</a>`:''}${canEdit?`<button class="tiny-btn" data-meeting-edit="${x.id}">Edit</button><button class="tiny-btn" data-meeting-complete="${x.id}">Complete</button><button class="tiny-btn" data-meeting-cancel="${x.id}">Cancel</button><button class="tiny-btn" data-meeting-delete="${x.id}">Delete</button>`:''}</span></div>`).join(''):'<div style="opacity:.7">No meetings recorded.</div>';
    if(canEdit){
      $$('[data-meeting-edit]',main).forEach(b=>b.onclick=()=>{const x=rows.find(r=>r.id===b.dataset.meetingEdit);if(!x)return;$('#prodMeetingId',main).value=x.id;$('#prodMeetingTitle',main).value=x.title||'';$('#prodMeetingType',main).value=x.meeting_type||'company';$('#prodMeetingStart',main).value=x.starts_at?new Date(x.starts_at).toISOString().slice(0,16):'';$('#prodMeetingEnd',main).value=x.ends_at?new Date(x.ends_at).toISOString().slice(0,16):'';$('#prodMeetingLocation',main).value=x.location||'';$('#prodMeetingUrl',main).value=x.meeting_url||'';$('#prodMeetingAudience',main).value=x.audience||'all';$('#prodMeetingStatus',main).value=x.status||'scheduled';$('#prodMeetingDescription',main).value=x.description||'';});
      $$('[data-meeting-complete]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('company_meetings').update({status:'completed',updated_at:new Date().toISOString()}).eq('id',b.dataset.meetingComplete);if(error)return toastMsg(error.message);await refresh();});
      $$('[data-meeting-cancel]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('company_meetings').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',b.dataset.meetingCancel);if(error)return toastMsg(error.message);await refresh();});
      $$('[data-meeting-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this meeting record?'))return;const {error}=await c.from('company_meetings').delete().eq('id',b.dataset.meetingDelete);if(error)return toastMsg(error.message);await refresh();});
    }
  };
  if(canEdit){
    const clear=()=>{['prodMeetingId','prodMeetingTitle','prodMeetingLocation','prodMeetingUrl','prodMeetingDescription','prodMeetingStart','prodMeetingEnd'].forEach(id=>{const e=$('#'+id,main);if(e)e.value='';});$('#prodMeetingType',main).value='company';$('#prodMeetingAudience',main).value='all';$('#prodMeetingStatus',main).value='scheduled';};
    $('#prodMeetingClear',main).onclick=clear;
    $('#prodMeetingSave',main).onclick=async()=>{try{const id=$('#prodMeetingId',main).value,title=$('#prodMeetingTitle',main).value.trim(),starts=$('#prodMeetingStart',main).value;if(!title||!starts)throw new Error('Title and start time are required.');const payload={title,description:$('#prodMeetingDescription',main).value.trim()||null,meeting_type:$('#prodMeetingType',main).value.trim()||'company',starts_at:new Date(starts).toISOString(),ends_at:$('#prodMeetingEnd',main).value?new Date($('#prodMeetingEnd',main).value).toISOString():null,location:$('#prodMeetingLocation',main).value.trim()||null,meeting_url:$('#prodMeetingUrl',main).value.trim()||null,audience:$('#prodMeetingAudience',main).value,status:$('#prodMeetingStatus',main).value,updated_at:new Date().toISOString()};let q;if(id)q=await c.from('company_meetings').update(payload).eq('id',id);else q=await c.from('company_meetings').insert({...payload,created_by:u.id});if(q.error)throw q.error;clear();toastMsg(id?'Meeting updated.':'Meeting scheduled.');await refresh();}catch(e){toastMsg('Meeting save failed: '+(e.message||e));}};
  }
  try{await refresh();}catch(e){$('#prodMeetingList',main).textContent='Unable to load meetings: '+(e.message||e);}
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
  const c=await sb(),u=await me();
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">COMPANY COMMUNICATIONS</div><h2>Company communications control.</h2><p>Create, edit, publish, schedule, archive and remove internal announcements.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><input id="prodCommId" type="hidden"><input id="prodCommTitle" class="mini-input" placeholder="Announcement title"><textarea id="prodCommBody" class="mini-input" style="height:120px;margin-top:10px" placeholder="Message"></textarea><div class="form-grid" style="margin-top:10px"><div><label>Audience</label><select id="prodCommAudience" class="mini-input"><option>all</option><option>agents</option><option>leadership</option></select></div><div><label>Publish At</label><input id="prodCommPublishAt" type="datetime-local" class="mini-input"></div></div><div class="row-actions"><button id="prodCommDraft" class="tiny-btn">Save Draft</button><button id="prodCommPublish" class="btn btn-primary">Publish Now</button><button id="prodCommClear" class="tiny-btn">Clear</button></div></div><div class="bo-card" style="margin-top:18px"><h3>Communication Registry</h3><div id="prodCommList">Loading...</div></div>`;
  const clear=()=>{['prodCommId','prodCommTitle','prodCommBody','prodCommPublishAt'].forEach(id=>$('#'+id,main).value='');$('#prodCommAudience',main).value='all';};
  const refresh=async()=>{const {data,error}=await c.from('company_communications').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;const rows=data||[];$('#prodCommList',main).innerHTML=rows.length?rows.map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.audience)} • ${esc(x.status)}${x.publish_at?' • scheduled '+new Date(x.publish_at).toLocaleString():''}</small></span><span class="team-actions"><button class="tiny-btn" data-comm-edit="${x.id}">Edit</button>${x.status!=='published'?`<button class="tiny-btn" data-comm-publish="${x.id}">Publish</button>`:''}${x.status!=='archived'?`<button class="tiny-btn" data-comm-archive="${x.id}">Archive</button>`:''}<button class="tiny-btn" data-comm-delete="${x.id}">Delete</button></span></div>`).join(''):'<div style="opacity:.7">No communications yet.</div>';
    $$('[data-comm-edit]',main).forEach(b=>b.onclick=()=>{const x=rows.find(r=>r.id===b.dataset.commEdit);if(!x)return;$('#prodCommId',main).value=x.id;$('#prodCommTitle',main).value=x.title||'';$('#prodCommBody',main).value=x.body||'';$('#prodCommAudience',main).value=x.audience||'all';$('#prodCommPublishAt',main).value=x.publish_at?new Date(x.publish_at).toISOString().slice(0,16):'';});
    $$('[data-comm-publish]',main).forEach(b=>b.onclick=async()=>{const now=new Date().toISOString();const {error}=await c.from('company_communications').update({status:'published',published_at:now,updated_at:now}).eq('id',b.dataset.commPublish);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-comm-archive]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('company_communications').update({status:'archived',updated_at:new Date().toISOString()}).eq('id',b.dataset.commArchive);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-comm-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this communication?'))return;const {error}=await c.from('company_communications').delete().eq('id',b.dataset.commDelete);if(error)return toastMsg(error.message);await refresh();});
  };
  async function save(status){try{const id=$('#prodCommId',main).value,title=$('#prodCommTitle',main).value.trim(),body=$('#prodCommBody',main).value.trim();if(!title||!body)throw new Error('Title and message are required.');const now=new Date().toISOString();const payload={title,body,audience:$('#prodCommAudience',main).value,status,publish_at:$('#prodCommPublishAt',main).value?new Date($('#prodCommPublishAt',main).value).toISOString():null,published_at:status==='published'?now:null,updated_at:now};const q=id?await c.from('company_communications').update(payload).eq('id',id):await c.from('company_communications').insert({...payload,created_by:u.id});if(q.error)throw q.error;clear();toastMsg(status==='published'?'Communication published.':'Draft saved.');await refresh();}catch(e){toastMsg('Communication save failed: '+(e.message||e));}}
  $('#prodCommDraft',main).onclick=()=>save('draft');$('#prodCommPublish',main).onclick=()=>save('published');$('#prodCommClear',main).onclick=clear;await refresh();
}

async function renderMarketing(main){
  if(main.dataset.marketingLive==='1') return; main.dataset.marketingLive='1';
  const c=await sb(),u=await me();
  const platforms=['Facebook','Instagram','LinkedIn','TikTok','YouTube','X'];
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">CORPORATE MARKETING CENTER</div><h2>Corporate content workflow.</h2><p>Prepare, approve and schedule company marketing content. Social Publishing remains the direct platform publishing workspace.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><textarea id="prodMktText" class="mini-input" style="height:150px" placeholder="Corporate post"></textarea><div style="margin-top:10px">${platforms.map(x=>`<label class="state-chip"><input type="checkbox" data-mkt-platform value="${x}"> ${x}</label>`).join('')}</div><div class="form-grid" style="margin-top:10px"><div><label>Media URL</label><input id="prodMktMedia" class="mini-input" placeholder="https://..."></div><div><label>Schedule For</label><input id="prodMktSchedule" type="datetime-local" class="mini-input"></div></div><div class="row-actions"><button id="prodMktAI" class="tiny-btn">✦ AI Polish</button><button id="prodMktDraft" class="tiny-btn">Save Draft</button><button id="prodMktApprove" class="btn btn-primary">Approve</button><button id="prodMktScheduleBtn" class="tiny-btn">Schedule</button></div></div><div class="bo-card" style="margin-top:18px"><h3>Content Queue</h3><div id="prodMktList">Loading...</div></div>`;
  $('#prodMktAI',main).onclick=async()=>{try{const prompt=$('#prodMktText',main).value.trim();if(!prompt)throw new Error('Enter text first.');const d=await invoke('ai-assistant',{action:'rewrite_social',prompt,style:'polished'});$('#prodMktText',main).value=d.text||prompt;toastMsg('AI polish complete.');}catch(e){toastMsg('AI unavailable: '+(e.message||e));}};
  const refresh=async()=>{const {data,error}=await c.from('marketing_posts').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;const rows=data||[];$('#prodMktList',main).innerHTML=rows.length?rows.map(x=>`<div class="resource"><span>${esc(x.content.slice(0,130))}${x.content.length>130?'…':''}<small style="display:block">${esc(x.status)}${x.platforms?.length?' • '+esc(x.platforms.join(', ')):''}${x.scheduled_for?' • '+new Date(x.scheduled_for).toLocaleString():''}</small></span><span class="team-actions">${x.status==='draft'?`<button class="tiny-btn" data-mkt-approve="${x.id}">Approve</button>`:''}<button class="tiny-btn" data-mkt-delete="${x.id}">Delete</button></span></div>`).join(''):'<div style="opacity:.7">No marketing posts yet.</div>';
    $$('[data-mkt-approve]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('marketing_posts').update({status:'approved',approved_by:u.id,updated_at:new Date().toISOString()}).eq('id',b.dataset.mktApprove);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-mkt-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this marketing record?'))return;const {error}=await c.from('marketing_posts').delete().eq('id',b.dataset.mktDelete);if(error)return toastMsg(error.message);await refresh();});
  };
  async function save(status){try{const content=$('#prodMktText',main).value.trim();if(!content)throw new Error('Enter post content first.');const selected=$$('[data-mkt-platform]:checked',main).map(x=>x.value);const scheduled=$('#prodMktSchedule',main).value?new Date($('#prodMktSchedule',main).value).toISOString():null;if(status==='scheduled'&&!scheduled)throw new Error('Choose a schedule date and time.');const {error}=await c.from('marketing_posts').insert({content,platforms:selected,media_url:$('#prodMktMedia',main).value.trim()||null,status,scheduled_for:scheduled,created_by:u.id,approved_by:['approved','scheduled'].includes(status)?u.id:null});if(error)throw error;$('#prodMktText',main).value='';$('#prodMktMedia',main).value='';$('#prodMktSchedule',main).value='';$$('[data-mkt-platform]',main).forEach(x=>x.checked=false);toastMsg('Marketing content saved.');await refresh();}catch(e){toastMsg('Marketing save failed: '+(e.message||e));}}
  $('#prodMktDraft',main).onclick=()=>save('draft');$('#prodMktApprove',main).onclick=()=>save('approved');$('#prodMktScheduleBtn',main).onclick=()=>save('scheduled');await refresh();
}

async function renderMedia(main){
  if(main.dataset.mediaLive==='1') return; main.dataset.mediaLive='1';
  const c=await sb(),u=await me();
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">MEDIA STUDIO</div><h2>Controlled company media library.</h2><p>Upload, preview, publish, archive and remove company media assets.</p></div></div><div class="real-data-banner">LIVE SUPABASE STORAGE + DATABASE</div><div class="bo-card" style="margin-top:18px"><div class="form-grid"><div><label>Asset Title</label><input id="prodMediaTitle" class="mini-input"></div><div><label>Audience</label><select id="prodMediaAudience" class="mini-input"><option>internal</option><option>all</option><option>agents</option><option>leadership</option></select></div></div><textarea id="prodMediaDescription" class="mini-input" style="height:80px;margin-top:10px" placeholder="Description"></textarea><input id="prodMediaFile" type="file" class="mini-input" style="margin-top:10px"><button id="prodMediaUpload" class="btn btn-primary" style="margin-top:10px">Upload Asset</button></div><div class="bo-card" style="margin-top:18px"><h3>Media Library</h3><div id="prodMediaList">Loading...</div></div>`;
  const refresh=async()=>{const {data,error}=await c.from('media_library').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;const rows=data||[];$('#prodMediaList',main).innerHTML=rows.length?rows.map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.media_type||'asset')} • ${esc(x.audience||'internal')} • ${esc(x.status)}</small></span><span class="team-actions">${x.storage_path?`<button class="tiny-btn" data-media-preview="${x.id}">Preview</button>`:''}${x.status!=='published'?`<button class="tiny-btn" data-media-publish="${x.id}">Publish</button>`:''}${x.status!=='archived'?`<button class="tiny-btn" data-media-archive="${x.id}">Archive</button>`:''}<button class="tiny-btn" data-media-delete="${x.id}">Delete</button></span></div>`).join(''):'<div style="opacity:.7">No media uploaded yet.</div>';
    $$('[data-media-preview]',main).forEach(b=>b.onclick=async()=>{const x=rows.find(r=>r.id===b.dataset.mediaPreview);if(!x?.storage_path)return;const {data,error}=await c.storage.from('allshield-private').createSignedUrl(x.storage_path,120);if(error)return toastMsg(error.message);window.open(data.signedUrl,'_blank','noopener');});
    $$('[data-media-publish]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('media_library').update({status:'published',updated_at:new Date().toISOString()}).eq('id',b.dataset.mediaPublish);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-media-archive]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('media_library').update({status:'archived',updated_at:new Date().toISOString()}).eq('id',b.dataset.mediaArchive);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-media-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this media asset and stored file?'))return;const x=rows.find(r=>r.id===b.dataset.mediaDelete);if(x?.storage_path){const rm=await c.storage.from('allshield-private').remove([x.storage_path]);if(rm.error)return toastMsg(rm.error.message);}const {error}=await c.from('media_library').delete().eq('id',b.dataset.mediaDelete);if(error)return toastMsg(error.message);await refresh();});
  };
  $('#prodMediaUpload',main).onclick=async()=>{try{const file=$('#prodMediaFile',main).files?.[0],title=$('#prodMediaTitle',main).value.trim();if(!file||!title)throw new Error('Title and file are required.');const path=`media/${u.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await c.storage.from('allshield-private').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up.error)throw up.error;const {error}=await c.from('media_library').insert({title,description:$('#prodMediaDescription',main).value.trim()||null,storage_path:path,media_type:file.type||null,audience:$('#prodMediaAudience',main).value,status:'draft',created_by:u.id});if(error)throw error;$('#prodMediaTitle',main).value='';$('#prodMediaDescription',main).value='';$('#prodMediaFile',main).value='';toastMsg('Media uploaded.');await refresh();}catch(e){toastMsg('Upload failed: '+(e.message||e));}};await refresh();
}

async function renderUpdates(main){
  if(main.dataset.updatesLive==='1') return; main.dataset.updatesLive='1';
  const c=await sb(),u=await me();
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">PLATFORM UPDATE CENTER</div><h2>Controlled release queue.</h2><p>Create, approve, release, cancel and remove platform change records.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><div class="form-grid"><div><label>Update Title</label><input id="prodUpdateTitle" class="mini-input"></div><div><label>Version Label</label><input id="prodUpdateVersion" class="mini-input" placeholder="e.g. B2026.08.26.001"></div></div><textarea id="prodUpdateSummary" class="mini-input" style="height:90px;margin-top:10px" placeholder="Summary"></textarea><textarea id="prodUpdatePayload" class="mini-input" style="height:90px;margin-top:10px" placeholder='Change payload JSON, optional'></textarea><button id="prodUpdateSave" class="btn btn-primary" style="margin-top:10px">Create Draft</button></div><div class="bo-card" style="margin-top:18px"><h3>Update Queue</h3><div id="prodUpdateList">Loading...</div></div>`;
  const refresh=async()=>{const {data,error}=await c.from('platform_updates').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;const rows=data||[];$('#prodUpdateList',main).innerHTML=rows.length?rows.map(x=>`<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.status)}${x.version_label?' • '+esc(x.version_label):''}${x.released_at?' • '+new Date(x.released_at).toLocaleString():''}</small></span><span class="team-actions">${x.status==='draft'?`<button class="tiny-btn" data-update-approve="${x.id}">Approve</button>`:''}${['draft','approved'].includes(x.status)?`<button class="tiny-btn" data-update-release="${x.id}">Release</button>`:''}${!['released','cancelled'].includes(x.status)?`<button class="tiny-btn" data-update-cancel="${x.id}">Cancel</button>`:''}<button class="tiny-btn" data-update-delete="${x.id}">Delete</button></span></div>`).join(''):'<div style="opacity:.7">No update records yet.</div>';
    $$('[data-update-approve]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('platform_updates').update({status:'approved',approved_by:u.id}).eq('id',b.dataset.updateApprove);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-update-release]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('platform_updates').update({status:'released',approved_by:u.id,released_at:new Date().toISOString()}).eq('id',b.dataset.updateRelease);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-update-cancel]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('platform_updates').update({status:'cancelled'}).eq('id',b.dataset.updateCancel);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-update-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this update record?'))return;const {error}=await c.from('platform_updates').delete().eq('id',b.dataset.updateDelete);if(error)return toastMsg(error.message);await refresh();});
  };
  $('#prodUpdateSave',main).onclick=async()=>{try{const title=$('#prodUpdateTitle',main).value.trim();if(!title)throw new Error('Enter an update title.');let payload={};const raw=$('#prodUpdatePayload',main).value.trim();if(raw)payload=JSON.parse(raw);const {error}=await c.from('platform_updates').insert({title,summary:$('#prodUpdateSummary',main).value.trim()||null,version_label:$('#prodUpdateVersion',main).value.trim()||null,status:'draft',change_payload:payload,created_by:u.id});if(error)throw error;$('#prodUpdateTitle',main).value='';$('#prodUpdateSummary',main).value='';$('#prodUpdateVersion',main).value='';$('#prodUpdatePayload',main).value='';toastMsg('Update draft created.');await refresh();}catch(e){toastMsg('Update draft failed: '+(e.message||e));}};await refresh();
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
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">DEPARTMENTS & ACCESS</div><h2>Department structure and assignments.</h2><p>Create departments and assign live team accounts to the correct operating group.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><div class="form-grid"><div><label>Department Name</label><input id="deptName" class="mini-input"></div><div><label>Slug</label><input id="deptSlug" class="mini-input" placeholder="auto-generated if blank"></div></div><button id="deptCreate" class="btn btn-primary" style="margin-top:10px">Create Department</button></div><div class="bo-card" style="margin-top:18px"><h3>Departments</h3><div id="deptList">Loading...</div></div><div class="bo-card" style="margin-top:18px"><h3>Team Assignments</h3><div id="deptAssignments">Loading...</div></div>`;
  const refresh=async()=>{const [d,p]=await Promise.all([c.from('departments').select('id,name,slug,created_at').order('name'),c.from('profiles').select('id,username,email,first_name,last_name,role,status,department_id,manager_id').order('last_name')]);if(d.error)throw d.error;if(p.error)throw p.error;const deps=d.data||[],people=p.data||[];
    $('#deptList',main).innerHTML=deps.length?deps.map(x=>{const members=people.filter(p=>p.department_id===x.id);return `<div class="resource"><span><strong>${esc(x.name)}</strong><small style="display:block">${esc(x.slug)} • ${members.length} people • ${members.filter(p=>p.status==='active').length} active</small></span><span class="team-actions">${members.length?'<span class="pill">IN USE</span>':`<button class="tiny-btn" data-dept-delete="${x.id}">Delete</button>`}</span></div>`}).join(''):'<div style="opacity:.7">No departments configured.</div>';
    $('#deptAssignments',main).innerHTML=people.length?`<table class="admin-table"><tr><th>Team Member</th><th>Role</th><th>Status</th><th>Department</th><th></th></tr>${people.map(x=>`<tr><td>${esc([x.first_name,x.last_name].filter(Boolean).join(' ')||x.username||x.email||'Account')}</td><td>${esc(x.role)}</td><td>${esc(x.status)}</td><td><select class="mini-input" data-dept-select="${x.id}"><option value="">None</option>${deps.map(d=>`<option value="${d.id}" ${x.department_id===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></td><td><button class="tiny-btn" data-dept-save="${x.id}">Save</button></td></tr>`).join('')}</table>`:'No team accounts.';
    $$('[data-dept-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this empty department?'))return;const {error}=await c.from('departments').delete().eq('id',b.dataset.deptDelete);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-dept-save]',main).forEach(b=>b.onclick=async()=>{try{const sel=$(`[data-dept-select="${b.dataset.deptSave}"]`,main);await window.allshieldManageTeamUser({action:'update',user_id:b.dataset.deptSave,department_id:sel.value||null});toastMsg('Department assignment saved.');await refresh();}catch(e){toastMsg('Assignment failed: '+(e.message||e));}});
  };
  $('#deptCreate',main).onclick=async()=>{try{const name=$('#deptName',main).value.trim();if(!name)throw new Error('Department name is required.');const slug=($('#deptSlug',main).value.trim()||name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).slice(0,80);const {error}=await c.from('departments').insert({name,slug});if(error)throw error;$('#deptName',main).value='';$('#deptSlug',main).value='';toastMsg('Department created.');await refresh();}catch(e){toastMsg('Department creation failed: '+(e.message||e));}};await refresh();
}

async function renderVersions(main){
  if(main.dataset.versionsLive==='1') return; main.dataset.versionsLive='1';
  const c=await sb(),u=await me();
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">CONTENT VERSIONING</div><h2>Controlled content history.</h2><p>Create immutable versions, publish approved revisions and retire superseded content.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card" style="margin-top:18px"><div class="form-grid"><div><label>Content Type</label><input id="verType" class="mini-input" placeholder="policy, script, training..."></div><div><label>Content Key</label><input id="verKey" class="mini-input" placeholder="unique-key"></div></div><textarea id="verPayload" class="mini-input" style="height:120px;margin-top:10px" placeholder='Payload JSON or plain text'></textarea><textarea id="verNotes" class="mini-input" style="height:70px;margin-top:10px" placeholder="Change notes"></textarea><button id="verCreate" class="btn btn-primary" style="margin-top:10px">Create Draft Version</button></div><div class="bo-card" style="margin-top:18px"><h3>Version Registry</h3><div id="verList">Loading...</div></div>`;
  const refresh=async()=>{const {data,error}=await c.from('content_versions').select('*').order('created_at',{ascending:false}).limit(150);if(error)throw error;const rows=data||[];$('#verList',main).innerHTML=rows.length?`<table class="admin-table"><tr><th>Type</th><th>Key</th><th>Version</th><th>Status</th><th>Created</th><th>Actions</th></tr>${rows.map(x=>`<tr><td>${esc(x.content_type)}</td><td>${esc(x.content_key)}</td><td>V${x.version_number}</td><td>${esc(x.status)}</td><td>${new Date(x.created_at).toLocaleString()}</td><td><div class="team-actions"><button class="tiny-btn" data-ver-view="${x.id}">View</button>${x.status==='draft'?`<button class="tiny-btn" data-ver-publish="${x.id}">Publish</button><button class="tiny-btn" data-ver-delete="${x.id}">Delete</button>`:''}${x.status==='published'?`<button class="tiny-btn" data-ver-retire="${x.id}">Retire</button>`:''}</div></td></tr>`).join('')}</table>`:'<div style="opacity:.7">No content versions recorded yet.</div>';
    $$('[data-ver-view]',main).forEach(b=>b.onclick=()=>{const x=rows.find(r=>r.id===b.dataset.verView);alert(JSON.stringify({type:x.content_type,key:x.content_key,version:x.version_number,status:x.status,payload:x.payload,change_notes:x.change_notes},null,2));});
    $$('[data-ver-publish]',main).forEach(b=>b.onclick=async()=>{const x=rows.find(r=>r.id===b.dataset.verPublish);const old=await c.from('content_versions').update({status:'retired'}).eq('content_type',x.content_type).eq('content_key',x.content_key).eq('status','published');if(old.error)return toastMsg(old.error.message);const {error}=await c.from('content_versions').update({status:'published',published_at:new Date().toISOString()}).eq('id',x.id);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-ver-retire]',main).forEach(b=>b.onclick=async()=>{const {error}=await c.from('content_versions').update({status:'retired'}).eq('id',b.dataset.verRetire);if(error)return toastMsg(error.message);await refresh();});
    $$('[data-ver-delete]',main).forEach(b=>b.onclick=async()=>{if(!confirm('Delete this draft version?'))return;const {error}=await c.from('content_versions').delete().eq('id',b.dataset.verDelete).eq('status','draft');if(error)return toastMsg(error.message);await refresh();});
  };
  $('#verCreate',main).onclick=async()=>{try{const type=$('#verType',main).value.trim(),key=$('#verKey',main).value.trim(),raw=$('#verPayload',main).value.trim();if(!type||!key)throw new Error('Content type and key are required.');let payload={text:raw};if(raw){try{payload=JSON.parse(raw)}catch{}}const {data:latest,error:le}=await c.from('content_versions').select('version_number').eq('content_type',type).eq('content_key',key).order('version_number',{ascending:false}).limit(1);if(le)throw le;const version=(latest?.[0]?.version_number||0)+1;const {error}=await c.from('content_versions').insert({content_type:type,content_key:key,version_number:version,status:'draft',payload,change_notes:$('#verNotes',main).value.trim()||null,created_by:u.id});if(error)throw error;$('#verType',main).value='';$('#verKey',main).value='';$('#verPayload',main).value='';$('#verNotes',main).value='';toastMsg('Draft version created.');await refresh();}catch(e){toastMsg('Version creation failed: '+(e.message||e));}};await refresh();
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
  const c=await sb(),u=await me();
  const state={project:null,projects:[],assets:[],jobs:[],youtube:null,ai:null,tab:'create'};
  const TYPES={
    long:{label:'Long-form YouTube',detail:'8–30 min • 16:9',duration:900,orientation:'16:9'},
    mid:{label:'Mid-form YouTube',detail:'3–8 min • 16:9',duration:360,orientation:'16:9'},
    short:{label:'Short-form Video',detail:'60–180 sec • 16:9 or 9:16',duration:120,orientation:'16:9'},
    shorts:{label:'YouTube Shorts',detail:'15–60 sec • 9:16',duration:45,orientation:'9:16'}
  };
  const fmtTime=s=>{s=Number(s||0);if(!s)return '—';const m=Math.floor(s/60),r=s%60;return m?`${m}:${String(r).padStart(2,'0')}`:`0:${String(r).padStart(2,'0')}`;};
  const projectBadge=p=>TYPES[p?.project_type]?.label||p?.project_type||'Video';

  main.innerHTML=`<style>
  #ytStudio .yt-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}
  #ytStudio .yt-tab{padding:10px 13px;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#091624;color:#9fb2c5;cursor:pointer}
  #ytStudio .yt-tab.on{background:#103456;border-color:#4da7e8;color:#fff}
  #ytStudio .yt-panel{display:none} #ytStudio .yt-panel.on{display:block}
  #ytStudio .yt-type-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0 18px}
  #ytStudio .yt-type{padding:15px;border-radius:14px;background:#091624;border:1px solid rgba(255,255,255,.08);cursor:pointer}
  #ytStudio .yt-type.on{background:#103456;border-color:#4da7e8}
  #ytStudio .yt-type strong{display:block;margin-bottom:5px} #ytStudio .yt-type small{color:#8298ad}
  #ytStudio .yt-split{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px}
  #ytStudio .yt-scene{padding:14px;border:1px solid rgba(255,255,255,.08);background:#091624;border-radius:14px;margin:10px 0}
  #ytStudio .yt-scene-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}
  #ytStudio .yt-scene-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
  #ytStudio .yt-asset{padding:13px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:#091624;margin:8px 0}
  #ytStudio .yt-asset-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
  #ytStudio .yt-project{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:#091624;margin:8px 0;cursor:pointer}
  #ytStudio .yt-project.on{border-color:#4da7e8;background:#103456}
  #ytStudio .yt-status{display:inline-flex;padding:5px 8px;border-radius:999px;background:#102b46;color:#8ed1ff;font-size:10px}
  #ytStudio .yt-status.good{background:rgba(43,160,103,.15);color:#92dfb8}
  #ytStudio .yt-status.warn{background:rgba(210,155,65,.13);color:#f0c783}
  #ytStudio .yt-thumb{width:100%;max-width:520px;border-radius:14px;border:1px solid rgba(255,255,255,.08);display:block}
  #ytStudio .yt-empty{opacity:.68;padding:16px 0}
  #ytStudio .yt-note{font-size:11px;line-height:1.55;color:#8da2b7}
  @media(max-width:1100px){#ytStudio .yt-type-grid{grid-template-columns:1fr 1fr}#ytStudio .yt-split{grid-template-columns:1fr}}
  @media(max-width:650px){#ytStudio .yt-type-grid,#ytStudio .yt-scene-grid{grid-template-columns:1fr}}
  </style>
  <div id="ytStudio">
    <div class="dashboard-head"><div><div class="kicker">VIDEO & YOUTUBE STUDIO</div><h2>Create, edit, repurpose and publish.</h2><p>Build long-form, mid-form, short-form and YouTube Shorts from a brief or source material, then manage scripts, scenes, voiceovers, thumbnails, final media and YouTube publishing.</p></div><button id="ytNewProject" class="btn btn-primary">+ New Video Project</button></div>
    <div class="real-data-banner">LIVE SUPABASE + ALLSHIELD AI + YOUTUBE WORKFLOW</div>
    <div class="yt-tabs">
      <button class="yt-tab on" data-yt-tab="create">Create</button>
      <button class="yt-tab" data-yt-tab="script">Script + Storyboard</button>
      <button class="yt-tab" data-yt-tab="assets">AI Clips + Voice</button>
      <button class="yt-tab" data-yt-tab="metadata">Metadata + Thumbnail</button>
      <button class="yt-tab" data-yt-tab="publish">Publish + Library</button>
    </div>
    <div class="yt-split">
      <div>
        <section class="yt-panel on" data-yt-panel="create">
          <div class="bo-card">
            <h3>Create for the right length.</h3>
            <div class="yt-type-grid">
              ${Object.entries(TYPES).map(([k,v])=>`<div class="yt-type ${k==='long'?'on':''}" data-yt-type="${k}"><strong>${v.label}</strong><small>${v.detail}</small></div>`).join('')}
            </div>
            <div class="form-grid">
              <div><label>Project Title</label><input id="ytProjectTitle" class="mini-input" placeholder="Working title"></div>
              <div><label>Target Duration (seconds)</label><input id="ytProjectDuration" type="number" min="15" class="mini-input" value="900"></div>
              <div><label>Orientation</label><select id="ytProjectOrientation" class="mini-input"><option>16:9</option><option>9:16</option><option>1:1</option></select></div>
              <div><label>Objective</label><select id="ytProjectObjective" class="mini-input"><option value="education">Education</option><option value="recruiting">Recruiting</option><option value="brand_awareness">Brand Awareness</option><option value="training">Training</option><option value="customer_education">Customer Education</option><option value="storytelling">Storytelling</option></select></div>
              <div><label>Audience</label><input id="ytProjectAudience" class="mini-input" placeholder="Who should watch this?"></div>
              <div><label>Tone</label><select id="ytProjectTone" class="mini-input"><option>Confident and human</option><option>Educational</option><option>Cinematic</option><option>Conversational</option><option>High energy</option><option>Professional</option><option>Inspirational</option></select></div>
            </div>
            <label style="display:block;margin-top:12px">Topic / Creative Brief</label><textarea id="ytProjectTopic" class="mini-input" style="height:100px" placeholder="What is this video about? What should the viewer understand, feel or do?"></textarea>
            <label style="display:block;margin-top:12px">Approved Source Material / Facts</label><textarea id="ytProjectSource" class="mini-input" style="height:130px" placeholder="Paste notes, transcript, approved facts, article summary, training material or other source content. AI is instructed not to invent unsupported claims."></textarea>
            <label style="display:block;margin-top:12px">Call to Action</label><input id="ytProjectCta" class="mini-input" placeholder="What should the viewer do next?">
            <div class="row-actions"><button id="ytSaveDraft" class="tiny-btn">Save Draft</button><button id="ytGeneratePackage" class="btn btn-primary">✦ Generate Full AI Production Package</button></div>
            <div id="ytCreateResult" class="publish-result"></div>
          </div>
        </section>

        <section class="yt-panel" data-yt-panel="script">
          <div class="bo-card"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h3 style="margin-bottom:5px">Script + Storyboard</h3><div class="yt-note">Edit anything AI prepared before moving into production.</div></div><button id="ytSaveScript" class="btn btn-primary">Save Script & Storyboard</button></div>
            <label style="display:block;margin-top:14px">Hook</label><textarea id="ytHook" class="mini-input" style="height:70px"></textarea>
            <label style="display:block;margin-top:12px">Outline — one beat per line</label><textarea id="ytOutline" class="mini-input" style="height:110px"></textarea>
            <label style="display:block;margin-top:12px">Full Script</label><textarea id="ytScript" class="mini-input" style="height:360px"></textarea>
            <label style="display:block;margin-top:12px">Captions / Transcript</label><textarea id="ytCaptions" class="mini-input" style="height:160px"></textarea>
          </div>
          <div class="bo-card" style="margin-top:16px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0">Storyboard Scenes</h3><button id="ytAddScene" class="tiny-btn">+ Add Scene</button></div><div id="ytStoryboard"><div class="yt-empty">Generate a production package or add a scene.</div></div></div>
        </section>

        <section class="yt-panel" data-yt-panel="assets">
          <div class="bo-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><h3 style="margin-bottom:5px">AI Clips + Voice</h3><div class="yt-note">Generate individual scene visuals and voiceovers, or upload your own footage. AI video clips are 4, 8 or 12 seconds and remain separate scene assets until you attach a final edited video.</div></div><button id="ytSyncClips" class="tiny-btn">Sync AI Clip Jobs</button></div>
            <div id="ytSceneProduction" style="margin-top:12px"></div>
          </div>
          <div class="bo-card" style="margin-top:16px"><h3>Upload Footage / Final Edit</h3><div class="form-grid"><div><label>Asset Type</label><select id="ytUploadType" class="mini-input"><option value="raw_video">Raw Footage</option><option value="final_video">Final Edited Video</option><option value="broll">B-roll</option><option value="audio">Audio</option></select></div><div><label>Asset Title</label><input id="ytUploadTitle" class="mini-input"></div></div><input id="ytUploadFile" type="file" accept="video/*,audio/*" class="mini-input" style="margin-top:10px"><button id="ytUploadAsset" class="btn btn-primary" style="margin-top:10px">Upload Asset</button><div class="yt-note" style="margin-top:10px">Use Final Edited Video for the file that will be sent to YouTube. Raw footage and generated scene assets stay available for your production workflow.</div></div>
          <div class="bo-card" style="margin-top:16px"><h3>Project Assets</h3><div id="ytAssets"><div class="yt-empty">Open a project to see its assets.</div></div></div>
        </section>

        <section class="yt-panel" data-yt-panel="metadata">
          <div class="bo-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><h3 style="margin-bottom:5px">YouTube Metadata</h3><div class="yt-note">Prepare title, description, tags, captions and thumbnail before publishing.</div></div><button id="ytGenerateMetadata" class="tiny-btn">✦ Generate Metadata</button></div>
            <label style="display:block;margin-top:14px">YouTube Title</label><input id="ytYoutubeTitle" class="mini-input" maxlength="100">
            <label style="display:block;margin-top:12px">YouTube Description</label><textarea id="ytYoutubeDescription" class="mini-input" style="height:210px"></textarea>
            <label style="display:block;margin-top:12px">Tags — comma separated</label><textarea id="ytTags" class="mini-input" style="height:80px"></textarea>
            <label style="display:block;margin-top:12px">Thumbnail Creative Brief</label><textarea id="ytThumbnailPrompt" class="mini-input" style="height:100px"></textarea>
            <div class="row-actions"><button id="ytSaveMetadata" class="tiny-btn">Save Metadata</button><button id="ytGenerateThumbnail" class="btn btn-primary">✦ Generate Thumbnail</button></div>
          </div>
          <div class="bo-card" style="margin-top:16px"><h3>Thumbnail Preview</h3><div id="ytThumbnailPreview"><div class="yt-empty">No thumbnail generated yet.</div></div></div>
          <div class="bo-card" style="margin-top:16px"><h3>Repurpose Plan</h3><p class="yt-note">AI can identify short clips from a longer project. Create a linked Short-form or Shorts project from any idea, then refine it independently.</p><div id="ytClipIdeas"><div class="yt-empty">Generate a production package to create cutdown ideas.</div></div></div>
        </section>

        <section class="yt-panel" data-yt-panel="publish">
          <div class="bo-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><h3 style="margin-bottom:5px">YouTube Channel</h3><div id="ytConnectionText" class="yt-note">Checking YouTube connection…</div></div><div id="ytConnectionActions"></div></div><div id="ytCallback" class="yt-note" style="margin-top:10px"></div></div>
          <div class="bo-card" style="margin-top:16px"><h3>Publish / Schedule</h3>
            <div class="form-grid">
              <div><label>Final Video</label><select id="ytPublishAsset" class="mini-input"><option value="">Select final video…</option></select></div>
              <div><label>Privacy</label><select id="ytPrivacy" class="mini-input"><option value="unlisted">Unlisted</option><option value="public">Public</option><option value="private">Private</option></select></div>
              <div><label>Schedule (optional)</label><input id="ytSchedule" type="datetime-local" class="mini-input"></div>
              <div><label>YouTube Category</label><select id="ytCategory" class="mini-input"><option value="27">Education</option><option value="22">People & Blogs</option><option value="25">News & Politics</option><option value="26">Howto & Style</option><option value="28">Science & Technology</option></select></div>
            </div>
            <div class="format-switch">
              <button class="format-btn on" data-dest="youtube">YouTube</button>
              <button class="format-btn" data-dest="youtube_shorts">YouTube Shorts</button>
              <button class="format-btn" data-dest="facebook">Facebook Video</button>
              <button class="format-btn" data-dest="instagram">Instagram Reels</button>
              <button class="format-btn" data-dest="tiktok">TikTok</button>
            </div>
            <div class="row-actions"><button id="ytPublishNow" class="btn btn-primary">Publish / Schedule to YouTube</button><button id="ytOpenSocial" class="tiny-btn">Open Social Publishing for Other Channels</button></div>
            <div id="ytPublishResult" class="publish-result"></div>
          </div>
          <div class="bo-card" style="margin-top:16px"><h3>Publishing Jobs</h3><div id="ytPublishJobs"><div class="yt-empty">No YouTube publishing jobs yet.</div></div></div>
        </section>
      </div>

      <aside>
        <div class="bo-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0">Video Projects</h3><button id="ytRefreshProjects" class="tiny-btn">Refresh</button></div><div id="ytProjectList"><div class="yt-empty">Loading projects…</div></div></div>
        <div class="bo-card" style="margin-top:16px"><h3>Current Project</h3><div id="ytCurrentProject" class="yt-note">No project selected.</div></div>
        <div class="bo-card" style="margin-top:16px"><h3>Production Path</h3><div class="yt-note">1. Choose format + brief<br>2. Generate/edit script + storyboard<br>3. Create/upload scene assets + voice<br>4. Attach final edited video<br>5. Generate metadata + thumbnail<br>6. Connect YouTube<br>7. Publish or schedule</div></div>
      </aside>
    </div>
  </div>`;

  const showResult=(id,msg)=>{const e=$('#'+id,main);if(!e)return;e.textContent=msg;e.classList.add('show');};
  const requireProject=()=>{if(!state.project?.id){toastMsg('Create or open a video project first.');return false}return true;};
  const setTab=name=>{state.tab=name;$$('[data-yt-tab]',main).forEach(b=>b.classList.toggle('on',b.dataset.ytTab===name));$$('[data-yt-panel]',main).forEach(p=>p.classList.toggle('on',p.dataset.ytPanel===name));};
  $$('[data-yt-tab]',main).forEach(b=>b.onclick=()=>setTab(b.dataset.ytTab));

  let selectedType='long';
  function selectType(type){
    selectedType=type;const spec=TYPES[type]||TYPES.long;
    $$('[data-yt-type]',main).forEach(x=>x.classList.toggle('on',x.dataset.ytType===type));
    $('#ytProjectDuration',main).value=String(spec.duration);
    $('#ytProjectOrientation',main).value=spec.orientation;
    $('#ytProjectOrientation',main).disabled=type==='shorts';
  }
  $$('[data-yt-type]',main).forEach(x=>x.onclick=()=>selectType(x.dataset.ytType));

  function clearForm(){
    state.project=null;state.assets=[];state.jobs=[];selectedType='long';selectType('long');
    ['ytProjectTitle','ytProjectAudience','ytProjectTopic','ytProjectSource','ytProjectCta','ytHook','ytOutline','ytScript','ytCaptions','ytYoutubeTitle','ytYoutubeDescription','ytTags','ytThumbnailPrompt'].forEach(id=>{const e=$('#'+id,main);if(e)e.value='';});
    $('#ytProjectObjective',main).value='education';$('#ytProjectTone',main).value='Confident and human';
    renderProjectDetail();renderStoryboard([]);renderSceneProduction([]);renderAssets();renderMetadata();renderJobs();
    setTab('create');$('#ytProjectTitle',main)?.focus();
  }

  async function refreshProjects(openId=null){
    const {data,error}=await c.from('video_projects').select('*').order('updated_at',{ascending:false}).limit(100);if(error)throw error;state.projects=data||[];
    const list=$('#ytProjectList',main);list.innerHTML=state.projects.length?state.projects.map(p=>`<div class="yt-project ${state.project?.id===p.id?'on':''}" data-project-id="${p.id}"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${esc(p.title)}</strong><span class="yt-status">${esc(p.status)}</span></div><small style="display:block;margin-top:5px;color:#8195aa">${esc(projectBadge(p))} • ${esc(p.orientation)} • ${fmtTime(p.target_duration_seconds)}</small></div>`).join(''):'<div class="yt-empty">No video projects yet. Create your first one.</div>';
    $$('[data-project-id]',list).forEach(el=>el.onclick=()=>openProject(el.dataset.projectId));
    if(openId) await openProject(openId);
  }

  function payloadFromForm(){
    return {title:$('#ytProjectTitle',main).value.trim(),project_type:selectedType,orientation:selectedType==='shorts'?'9:16':$('#ytProjectOrientation',main).value,target_duration_seconds:Math.max(15,Number($('#ytProjectDuration',main).value||TYPES[selectedType].duration)),topic:$('#ytProjectTopic',main).value.trim()||null,objective:$('#ytProjectObjective',main).value||null,audience:$('#ytProjectAudience',main).value.trim()||null,tone:$('#ytProjectTone',main).value||null,source_material:$('#ytProjectSource',main).value.trim()||null,call_to_action:$('#ytProjectCta',main).value.trim()||null,updated_at:new Date().toISOString()};
  }

  async function saveDraft(){
    const p=payloadFromForm();if(!p.title)throw new Error('Project title is required.');
    if(state.project?.id){const {data,error}=await c.from('video_projects').update(p).eq('id',state.project.id).select('*').single();if(error)throw error;state.project=data;}
    else{const {data,error}=await c.from('video_projects').insert({...p,created_by:u.id,status:'draft'}).select('*').single();if(error)throw error;state.project=data;}
    renderProjectDetail();await refreshProjects();return state.project;
  }

  async function generatePackage(){
    try{const p=await saveDraft();showResult('ytCreateResult','Generating script, storyboard, YouTube metadata and repurpose ideas…');const d=await invoke('video-studio-ai',{action:'generate_package',project_id:p.id});state.project=d.project;fillProject(state.project);await loadProjectRelated();showResult('ytCreateResult','AI production package created. Review the script and storyboard before production.');setTab('script');await refreshProjects();}catch(e){showResult('ytCreateResult','Error: '+(e.message||e));}
  }

  function fillProject(p){
    if(!p)return;selectedType=p.project_type||'long';$$('[data-yt-type]',main).forEach(x=>x.classList.toggle('on',x.dataset.ytType===selectedType));
    $('#ytProjectTitle',main).value=p.title||'';$('#ytProjectDuration',main).value=p.target_duration_seconds||TYPES[selectedType]?.duration||900;$('#ytProjectOrientation',main).value=p.orientation||TYPES[selectedType]?.orientation||'16:9';$('#ytProjectOrientation',main).disabled=selectedType==='shorts';
    $('#ytProjectObjective',main).value=p.objective||'education';$('#ytProjectAudience',main).value=p.audience||'';$('#ytProjectTone',main).value=p.tone||'Confident and human';$('#ytProjectTopic',main).value=p.topic||'';$('#ytProjectSource',main).value=p.source_material||'';$('#ytProjectCta',main).value=p.call_to_action||'';
    $('#ytHook',main).value=p.hook||'';$('#ytOutline',main).value=(Array.isArray(p.outline)?p.outline:[]).join('\n');$('#ytScript',main).value=p.script||'';$('#ytCaptions',main).value=p.captions||'';
    $('#ytYoutubeTitle',main).value=p.youtube_title||'';$('#ytYoutubeDescription',main).value=p.youtube_description||'';$('#ytTags',main).value=(Array.isArray(p.tags)?p.tags:[]).join(', ');$('#ytThumbnailPrompt',main).value=p.thumbnail_prompt||'';
    renderStoryboard(Array.isArray(p.storyboard)?p.storyboard:[]);renderSceneProduction(Array.isArray(p.storyboard)?p.storyboard:[]);renderMetadata();renderProjectDetail();
  }

  async function openProject(id){
    try{const {data,error}=await c.from('video_projects').select('*').eq('id',id).single();if(error)throw error;state.project=data;fillProject(data);await loadProjectRelated();$$('[data-project-id]',main).forEach(x=>x.classList.toggle('on',x.dataset.projectId===id));}catch(e){toastMsg('Unable to open video project: '+(e.message||e));}
  }

  async function loadProjectRelated(){
    if(!state.project?.id){state.assets=[];state.jobs=[];renderAssets();renderJobs();return}
    const [a,j]=await Promise.all([c.from('video_project_assets').select('*').eq('project_id',state.project.id).order('created_at',{ascending:false}),c.from('video_publish_jobs').select('*').eq('project_id',state.project.id).order('created_at',{ascending:false})]);
    if(a.error)throw a.error;if(j.error)throw j.error;state.assets=a.data||[];state.jobs=j.data||[];renderAssets();renderSceneProduction(Array.isArray(state.project.storyboard)?state.project.storyboard:[]);renderMetadata();renderJobs();renderPublishAssets();
  }

  function renderProjectDetail(){
    const e=$('#ytCurrentProject',main);if(!e)return;if(!state.project){e.innerHTML='No project selected.';return}
    e.innerHTML=`<strong style="color:white">${esc(state.project.title)}</strong><div style="margin-top:7px">${esc(projectBadge(state.project))}<br>${esc(state.project.orientation)} • target ${fmtTime(state.project.target_duration_seconds)}<br>Status: <span class="yt-status">${esc(state.project.status)}</span></div><div class="row-actions"><button id="ytArchiveProject" class="tiny-btn">Archive</button><button id="ytDeleteProject" class="tiny-btn">Delete</button></div>`;
    $('#ytArchiveProject',e).onclick=async()=>{if(!requireProject())return;const {error}=await c.from('video_projects').update({status:'archived',updated_at:new Date().toISOString()}).eq('id',state.project.id);if(error)return toastMsg(error.message);state.project.status='archived';renderProjectDetail();refreshProjects();};
    $('#ytDeleteProject',e).onclick=async()=>{if(!requireProject()||!confirm('Delete this video project and its project assets/jobs? Uploaded media-library files remain unless removed separately.'))return;const {error}=await c.from('video_projects').delete().eq('id',state.project.id);if(error)return toastMsg(error.message);clearForm();refreshProjects();};
  }

  function renderStoryboard(scenes){
    const box=$('#ytStoryboard',main);if(!box)return;box.innerHTML=scenes.length?scenes.map((s,i)=>`<div class="yt-scene" data-scene="${i}"><div class="yt-scene-head"><strong>Scene ${i+1}: <input data-scene-title class="mini-input" style="display:inline-block;width:min(360px,60vw)" value="${esc(s.title||'')}"></strong><button class="tiny-btn" data-remove-scene="${i}">Remove</button></div><div class="yt-scene-grid"><div><label>Duration (sec)</label><input data-scene-duration type="number" min="1" class="mini-input" value="${Number(s.duration_seconds||8)}"></div><div><label>On-screen Text</label><input data-scene-text class="mini-input" value="${esc(s.on_screen_text||'')}"></div></div><label style="display:block;margin-top:9px">Narration</label><textarea data-scene-narration class="mini-input" style="height:90px">${esc(s.narration||'')}</textarea><label style="display:block;margin-top:9px">Visual Direction</label><textarea data-scene-visual class="mini-input" style="height:75px">${esc(s.visual_direction||'')}</textarea><label style="display:block;margin-top:9px">AI Video Prompt</label><textarea data-scene-prompt class="mini-input" style="height:75px">${esc(s.sora_prompt||s.visual_direction||'')}</textarea></div>`).join(''):'<div class="yt-empty">Generate a production package or add a scene.</div>';
    $$('[data-remove-scene]',box).forEach(b=>b.onclick=()=>{const arr=collectStoryboard();arr.splice(Number(b.dataset.removeScene),1);renderStoryboard(arr);renderSceneProduction(arr);});
  }

  function collectStoryboard(){return $$('[data-scene]',main).map(card=>({title:$('[data-scene-title]',card)?.value.trim()||'',duration_seconds:Math.max(1,Number($('[data-scene-duration]',card)?.value||8)),narration:$('[data-scene-narration]',card)?.value.trim()||'',visual_direction:$('[data-scene-visual]',card)?.value.trim()||'',on_screen_text:$('[data-scene-text]',card)?.value.trim()||'',sora_prompt:$('[data-scene-prompt]',card)?.value.trim()||''}));}

  async function saveScript(){
    if(!requireProject())return;
    try{const patch={hook:$('#ytHook',main).value.trim()||null,outline:$('#ytOutline',main).value.split('\n').map(x=>x.trim()).filter(Boolean),script:$('#ytScript',main).value.trim()||null,captions:$('#ytCaptions',main).value.trim()||null,storyboard:collectStoryboard(),status:'script_ready',updated_at:new Date().toISOString()};const {data,error}=await c.from('video_projects').update(patch).eq('id',state.project.id).select('*').single();if(error)throw error;state.project=data;fillProject(data);toastMsg('Script and storyboard saved.');}catch(e){toastMsg('Save failed: '+(e.message||e));}
  }

  function renderSceneProduction(scenes){
    const box=$('#ytSceneProduction',main);if(!box)return;if(!state.project){box.innerHTML='<div class="yt-empty">Create or open a project first.</div>';return}
    box.innerHTML=scenes.length?scenes.map((s,i)=>{const related=state.assets.filter(a=>a.scene_index===i&&(a.asset_type==='ai_clip'||a.asset_type==='voiceover'));return `<div class="yt-scene"><div class="yt-scene-head"><div><strong>Scene ${i+1}: ${esc(s.title||'Untitled')}</strong><div class="yt-note">${esc(s.visual_direction||'No visual direction yet.')}</div></div><span class="yt-status">${related.length} assets</span></div><div class="form-grid"><div><label>AI Clip Length</label><select class="mini-input" data-clip-seconds="${i}"><option value="4">4 sec</option><option value="8" selected>8 sec</option><option value="12">12 sec</option></select></div><div><label>Voice</label><select class="mini-input" data-voice="${i}"><option>cedar</option><option>alloy</option><option>coral</option><option>echo</option><option>fable</option><option>nova</option><option>onyx</option><option>sage</option><option>shimmer</option></select></div></div><div class="row-actions"><button class="tiny-btn" data-generate-clip="${i}">✦ Generate AI Scene Clip</button><button class="tiny-btn" data-generate-voice="${i}">Generate Voiceover</button></div>${related.map(a=>`<div class="yt-note">${esc(a.asset_type)} • ${esc(a.status)}${a.duration_seconds?' • '+a.duration_seconds+' sec':''}${a.metadata?.progress!==undefined?' • '+a.metadata.progress+'%':''}</div>`).join('')}</div>`}).join(''):'<div class="yt-empty">No storyboard scenes yet. Generate a package or add scenes under Script + Storyboard.</div>';
    $$('[data-generate-clip]',box).forEach(b=>b.onclick=()=>generateClip(Number(b.dataset.generateClip)));
    $$('[data-generate-voice]',box).forEach(b=>b.onclick=()=>generateVoice(Number(b.dataset.generateVoice)));
  }

  async function generateClip(i){if(!requireProject())return;try{await saveScript();const scene=(state.project.storyboard||[])[i]||collectStoryboard()[i]||{};const seconds=Number($(`[data-clip-seconds="${i}"]`,main)?.value||8);toastMsg('AI scene clip generation started.');await invoke('video-studio-ai',{action:'generate_scene_clip',project_id:state.project.id,scene_index:i,seconds,prompt:scene.sora_prompt||scene.visual_direction||''});await loadProjectRelated();}catch(e){toastMsg('AI clip generation failed: '+(e.message||e));}}
  async function generateVoice(i){if(!requireProject())return;try{await saveScript();const scene=(state.project.storyboard||[])[i]||{};if(!String(scene.narration||'').trim())throw new Error('Add narration to this scene first.');const voice=$(`[data-voice="${i}"]`,main)?.value||'cedar';toastMsg('Generating voiceover…');await invoke('video-studio-ai',{action:'generate_voiceover',project_id:state.project.id,scene_index:i,text:scene.narration,voice,title:`${state.project.title} — Scene ${i+1} Voiceover`});await loadProjectRelated();toastMsg('Voiceover ready.');}catch(e){toastMsg('Voiceover generation failed: '+(e.message||e));}}
  async function syncClips(){if(!requireProject())return;try{const d=await invoke('video-studio-ai',{action:'sync_clips',project_id:state.project.id});await loadProjectRelated();toastMsg(`AI clip sync complete (${(d.updates||[]).length} checked).`);}catch(e){toastMsg('Clip sync failed: '+(e.message||e));}}

  async function previewAsset(id){const a=state.assets.find(x=>x.id===id);if(!a)return;if(a.public_url)return window.open(a.public_url,'_blank','noopener');if(!a.storage_path)return toastMsg('This asset is still generating or has no stored file.');const {data,error}=await c.storage.from(a.storage_bucket||'allshield-private').createSignedUrl(a.storage_path,180);if(error)return toastMsg(error.message);window.open(data.signedUrl,'_blank','noopener');}

  function renderAssets(){
    const box=$('#ytAssets',main);if(!box)return;box.innerHTML=state.assets.length?state.assets.map(a=>`<div class="yt-asset"><div class="yt-asset-head"><div><strong>${esc(a.title||a.asset_type)}</strong><div class="yt-note">${esc(a.asset_type)} • ${esc(a.status)}${a.duration_seconds?' • '+a.duration_seconds+' sec':''}</div></div><div class="team-actions">${(a.public_url||a.storage_path)?`<button class="tiny-btn" data-preview-asset="${a.id}">Preview</button>`:''}<button class="tiny-btn" data-delete-asset="${a.id}">Remove</button></div></div></div>`).join(''):'<div class="yt-empty">No assets attached to this project yet.</div>';
    $$('[data-preview-asset]',box).forEach(b=>b.onclick=()=>previewAsset(b.dataset.previewAsset));
    $$('[data-delete-asset]',box).forEach(b=>b.onclick=async()=>{const a=state.assets.find(x=>x.id===b.dataset.deleteAsset);if(!a||!confirm('Remove this project asset?'))return;if(a.storage_path){const rm=await c.storage.from(a.storage_bucket||'allshield-private').remove([a.storage_path]);if(rm.error)return toastMsg(rm.error.message);}if(a.media_library_id)await c.from('media_library').delete().eq('id',a.media_library_id);const {error}=await c.from('video_project_assets').delete().eq('id',a.id);if(error)return toastMsg(error.message);await loadProjectRelated();});
    renderPublishAssets();
  }

  async function uploadAsset(){
    if(!requireProject())return;const file=$('#ytUploadFile',main).files?.[0],type=$('#ytUploadType',main).value,title=$('#ytUploadTitle',main).value.trim()||file?.name;if(!file)return toastMsg('Choose a video or audio file first.');
    try{const path=`video-projects/${u.id}/${state.project.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await c.storage.from('allshield-private').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up.error)throw up.error;const mediaType=file.type||((type==='audio'||type==='voiceover')?'audio':'video');const {data:ml,error:me}=await c.from('media_library').insert({title,description:`YouTube Studio asset for ${state.project.title}`,storage_path:path,media_type:mediaType,audience:'internal',status:'draft',created_by:u.id,metadata:{source:'youtube-studio',project_id:state.project.id,asset_type:type,original_filename:file.name}}).select('*').single();if(me)throw me;const {data:a,error:ae}=await c.from('video_project_assets').insert({project_id:state.project.id,created_by:u.id,asset_type:type,title,status:'ready',storage_bucket:'allshield-private',storage_path:path,media_library_id:ml.id,orientation:state.project.orientation,metadata:{mime_type:mediaType,original_filename:file.name,size_bytes:file.size}}).select('*').single();if(ae)throw ae;if(type==='final_video'){const {data:p,error:pe}=await c.from('video_projects').update({final_media_library_id:ml.id,status:'ready',updated_at:new Date().toISOString()}).eq('id',state.project.id).select('*').single();if(pe)throw pe;state.project=p;fillProject(p);}$('#ytUploadFile',main).value='';$('#ytUploadTitle',main).value='';await loadProjectRelated();toastMsg(type==='final_video'?'Final video attached and ready for publishing.':'Asset uploaded.');}catch(e){toastMsg('Asset upload failed: '+(e.message||e));}
  }

  function renderMetadata(){
    const thumb=$('#ytThumbnailPreview',main),ideas=$('#ytClipIdeas',main);if(!thumb||!ideas)return;const thumbs=state.assets.filter(a=>a.asset_type==='thumbnail'&&a.status==='ready');thumb.innerHTML=thumbs.length?`<img class="yt-thumb" src="${esc(thumbs[0].public_url||'')}" alt="Generated YouTube thumbnail"><div class="row-actions"><a class="tiny-btn" href="${esc(thumbs[0].public_url||'#')}" target="_blank" rel="noopener">Open Full Size</a></div>`:'<div class="yt-empty">No thumbnail generated yet.</div>';
    const clips=Array.isArray(state.project?.metadata?.clip_ideas)?state.project.metadata.clip_ideas:[];ideas.innerHTML=clips.length?clips.map((x,i)=>`<div class="yt-asset"><strong>${esc(x.title||`Clip ${i+1}`)}</strong><div class="yt-note">${esc(x.format||'short')} • ${Number(x.duration_seconds||0)||'—'} sec<br>${esc(x.hook||'')}<br>${esc(x.source_section||'')}</div><button class="tiny-btn" data-create-cutdown="${i}" style="margin-top:8px">Create Linked ${String(x.format||'short').toLowerCase()==='shorts'?'Shorts':'Short-form'} Project</button></div>`).join(''):'<div class="yt-empty">Generate a production package to create cutdown ideas.</div>';
    $$('[data-create-cutdown]',ideas).forEach(b=>b.onclick=()=>createCutdown(Number(b.dataset.createCutdown)));
  }

  async function saveMetadata(){if(!requireProject())return null;const patch={youtube_title:$('#ytYoutubeTitle',main).value.trim()||null,youtube_description:$('#ytYoutubeDescription',main).value.trim()||null,tags:$('#ytTags',main).value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,50),thumbnail_prompt:$('#ytThumbnailPrompt',main).value.trim()||null,metadata:{...(state.project.metadata||{}),youtube_category_id:$('#ytCategory',main)?.value||state.project.metadata?.youtube_category_id||'27'},updated_at:new Date().toISOString()};const {data,error}=await c.from('video_projects').update(patch).eq('id',state.project.id).select('*').single();if(error)throw error;state.project=data;return data;}
  async function generateMetadata(){if(!requireProject())return;try{await saveDraft();const d=await invoke('video-studio-ai',{action:'generate_metadata',project_id:state.project.id});state.project=d.project;fillProject(state.project);await loadProjectRelated();toastMsg('YouTube metadata generated.');}catch(e){toastMsg('Metadata generation failed: '+(e.message||e));}}
  async function generateThumbnail(){if(!requireProject())return;try{await saveMetadata();toastMsg('Generating YouTube thumbnail…');await invoke('video-studio-ai',{action:'generate_thumbnail',project_id:state.project.id,prompt:$('#ytThumbnailPrompt',main).value.trim()});await loadProjectRelated();toastMsg('Thumbnail ready.');}catch(e){toastMsg('Thumbnail generation failed: '+(e.message||e));}}

  async function createCutdown(i){
    if(!requireProject())return;const x=state.project.metadata?.clip_ideas?.[i];if(!x)return;const type=String(x.format||'short').toLowerCase()==='shorts'?'shorts':'short';const spec=TYPES[type];const source=[`Parent project: ${state.project.title}`,`Suggested source section: ${x.source_section||''}`,`Parent script: ${state.project.script||''}`].join('\n\n');const payload={created_by:u.id,title:x.title||`${state.project.title} — Short`,project_type:type,orientation:'9:16',target_duration_seconds:Math.max(15,Math.min(type==='shorts'?60:180,Number(x.duration_seconds||spec.duration))),topic:x.hook||x.title||'',objective:state.project.objective,audience:state.project.audience,tone:state.project.tone,source_material:source,call_to_action:state.project.call_to_action,status:'draft',metadata:{parent_project_id:state.project.id,source_clip_idea:x}};const {data,error}=await c.from('video_projects').insert(payload).select('*').single();if(error)return toastMsg(error.message);await refreshProjects(data.id);setTab('create');toastMsg('Linked short-form project created.');
  }

  function renderPublishAssets(){const s=$('#ytPublishAsset',main);if(!s)return;const finals=state.assets.filter(a=>['final_video','raw_video'].includes(a.asset_type)&&a.status==='ready');s.innerHTML='<option value="">Select final video…</option>'+finals.map(a=>`<option value="${a.id}" ${a.media_library_id&&a.media_library_id===state.project?.final_media_library_id?'selected':''}>${esc(a.title||a.asset_type)} (${esc(a.asset_type)})</option>`).join('');}
  function renderJobs(){const box=$('#ytPublishJobs',main);if(!box)return;box.innerHTML=state.jobs.length?state.jobs.map(j=>`<div class="yt-asset"><div class="yt-asset-head"><div><strong>${esc(j.platform)}</strong><div class="yt-note">${esc(j.status)}${j.scheduled_for?' • '+new Date(j.scheduled_for).toLocaleString():''}${j.external_ref?' • '+esc(j.external_ref):''}${j.error_message?'<br>'+esc(j.error_message):''}</div></div>${j.external_ref&&j.platform==='youtube'?`<a class="tiny-btn" href="https://www.youtube.com/watch?v=${encodeURIComponent(j.external_ref)}" target="_blank" rel="noopener">Open</a>`:''}</div></div>`).join(''):'<div class="yt-empty">No YouTube publishing jobs yet.</div>';}

  async function loadServiceStatus(){try{state.ai=await invoke('video-studio-ai',{action:'status'});}catch(e){state.ai={ai_ready:false,error:e.message||String(e)}}try{state.youtube=await invoke('youtube-oauth',{action:'status'});}catch(e){state.youtube={configured:false,connection:{status:'not_connected'},error:e.message||String(e)}}renderConnection();}
  function renderConnection(){
    const t=$('#ytConnectionText',main),a=$('#ytConnectionActions',main),cb=$('#ytCallback',main);if(!t||!a||!cb)return;const y=state.youtube||{},conn=y.connection||{},connected=conn.status==='connected';t.innerHTML=connected?`<span class="yt-status good">CONNECTED</span> ${esc(conn.account_name||'YouTube Channel')}`:y.configured?`<span class="yt-status warn">NOT CONNECTED</span> Google OAuth is configured. Connect the channel once, then publishing can run from this studio.`:`<span class="yt-status warn">SETUP REQUIRED</span> Add YouTube/Google OAuth Client ID and Client Secret to Supabase Edge Function secrets before direct YouTube publishing can be authorized.`;
    a.innerHTML=connected?'<button id="ytDisconnectYoutube" class="tiny-btn">Disconnect</button>':y.configured?'<button id="ytConnectYoutube" class="btn btn-primary">Connect YouTube</button>':'';cb.textContent=y.callback_url?`OAuth callback URL: ${y.callback_url}`:'';if($('#ytConnectYoutube',a))$('#ytConnectYoutube',a).onclick=connectYoutube;if($('#ytDisconnectYoutube',a))$('#ytDisconnectYoutube',a).onclick=disconnectYoutube;
  }
  async function connectYoutube(){try{const d=await invoke('youtube-oauth',{action:'start',return_url:location.href});if(d.authorization_url)location.href=d.authorization_url;else throw new Error('Authorization URL was not returned.');}catch(e){toastMsg('YouTube connection could not start: '+(e.message||e));}}
  async function disconnectYoutube(){if(!confirm('Disconnect the YouTube channel from Allshield?'))return;try{await invoke('youtube-oauth',{action:'disconnect'});await loadServiceStatus();toastMsg('YouTube disconnected.');}catch(e){toastMsg(e.message||e)}}

  async function publishYoutube(){
    if(!requireProject())return;const assetId=$('#ytPublishAsset',main).value;if(!assetId)return showResult('ytPublishResult','Select a final video asset first.');
    try{await saveMetadata();const destinations=$$('[data-dest].on',main).map(x=>x.dataset.dest);await c.from('video_projects').update({publish_destinations:destinations,scheduled_for:$('#ytSchedule',main).value?new Date($('#ytSchedule',main).value).toISOString():null,updated_at:new Date().toISOString()}).eq('id',state.project.id);if(!destinations.includes('youtube')&&!destinations.includes('youtube_shorts'))throw new Error('Select YouTube or YouTube Shorts for direct YouTube publishing.');showResult('ytPublishResult','Uploading to YouTube. Keep this page open until the upload finishes…');const d=await invoke('youtube-publish',{action:'publish',project_id:state.project.id,asset_id:assetId,privacy:$('#ytPrivacy',main).value,scheduled_for:$('#ytSchedule',main).value?new Date($('#ytSchedule',main).value).toISOString():null,category_id:$('#ytCategory',main).value,title:$('#ytYoutubeTitle',main).value.trim(),description:$('#ytYoutubeDescription',main).value.trim()});showResult('ytPublishResult',d.status==='scheduled'?`YouTube upload complete and scheduled. Video ID: ${d.video_id||'pending'}`:`Published to YouTube. ${d.youtube_url||''}`);await openProject(state.project.id);}catch(e){showResult('ytPublishResult','Error: '+(e.message||e));}
  }

  $$('[data-dest]',main).forEach(b=>b.onclick=()=>b.classList.toggle('on'));
  $('#ytNewProject',main).onclick=clearForm;$('#ytRefreshProjects',main).onclick=()=>refreshProjects();$('#ytSaveDraft',main).onclick=async()=>{try{await saveDraft();showResult('ytCreateResult','Draft saved.');await refreshProjects();}catch(e){showResult('ytCreateResult','Error: '+(e.message||e));}};
  $('#ytGeneratePackage',main).onclick=generatePackage;$('#ytSaveScript',main).onclick=saveScript;$('#ytAddScene',main).onclick=()=>{const arr=collectStoryboard();arr.push({title:`Scene ${arr.length+1}`,duration_seconds:8,narration:'',visual_direction:'',on_screen_text:'',sora_prompt:''});renderStoryboard(arr);renderSceneProduction(arr);};
  $('#ytSyncClips',main).onclick=syncClips;$('#ytUploadAsset',main).onclick=uploadAsset;$('#ytGenerateMetadata',main).onclick=generateMetadata;$('#ytSaveMetadata',main).onclick=async()=>{try{await saveMetadata();toastMsg('YouTube metadata saved.');}catch(e){toastMsg(e.message||e)}};
  $('#ytGenerateThumbnail',main).onclick=generateThumbnail;$('#ytPublishNow',main).onclick=publishYoutube;$('#ytOpenSocial',main).onclick=()=>window.showOwnerView?.('social',document.querySelector('#ownerPortal .side-link[onclick*="social"]'));
  await Promise.all([refreshProjects(),loadServiceStatus()]);
  const qs=new URLSearchParams(location.search);if(qs.get('youtube_oauth'))toastMsg(qs.get('youtube_oauth')==='success'?'YouTube connected.':'YouTube connection returned an error.');
}

async function renderBrand(main){
  if(main.dataset.brandLive==='1') return; main.dataset.brandLive='1';
  const c=await sb(),u=await me();
  const {data,error}=await c.from('social_brand_profiles').select('*').eq('profile_key','allshield_primary').maybeSingle();if(error)throw error;const x=data||{};
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">BRAND CENTER</div><h2>Approved Allshield brand system.</h2><p>The homepage shield and wordmark are the approved production identity. No alternate legacy crest is used here.</p></div></div><div class="real-data-banner">APPROVED HOMEPAGE BRAND + LIVE SUPABASE PROFILE</div>
  <div class="bo-card" style="margin-top:18px;text-align:center"><img src="assets/brand-9aa0ec99b3b0.webp" alt="Approved Allshield shield" style="width:min(230px,55%);height:auto;display:block;margin:0 auto 22px"><img src="assets/brand-6553d9469f9e.webp" alt="Allshield Insurance Group" style="width:min(520px,90%);height:auto;display:block;margin:0 auto"></div>
  <div class="bo-card" style="margin-top:18px"><div class="form-grid"><div><label>Company Name</label><input id="brandCompany" class="mini-input" value="${esc(x.company_name||'Allshield Insurance Group')}"></div><div><label>Website</label><input id="brandWebsite" class="mini-input" value="${esc(x.website_url||'')}"></div></div><label>Short Description</label><textarea id="brandShort" class="mini-input" style="height:80px">${esc(x.short_description||'')}</textarea><label>Mission</label><textarea id="brandMission" class="mini-input" style="height:80px">${esc(x.mission||'')}</textarea><label>Brand Voice</label><textarea id="brandVoice" class="mini-input" style="height:80px">${esc(x.brand_voice||'')}</textarea><div class="form-grid"><div><label>Default CTA</label><input id="brandCTA" class="mini-input" value="${esc(x.default_cta||'')}"></div><div><label>Recruiting Message</label><input id="brandRecruiting" class="mini-input" value="${esc(x.recruiting_message||'')}"></div></div><div class="form-grid"><div><label>Services (one per line)</label><textarea id="brandServices" class="mini-input" style="height:90px">${esc((x.services||[]).join('\n'))}</textarea></div><div><label>Service Areas (one per line)</label><textarea id="brandAreas" class="mini-input" style="height:90px">${esc((x.service_areas||[]).join('\n'))}</textarea></div></div><label>Claims / wording AI must never invent (one per line)</label><textarea id="brandProhibited" class="mini-input" style="height:90px">${esc((x.prohibited_claims||[]).join('\n'))}</textarea><div class="row-actions"><button id="brandSave" class="tiny-btn">Save Brand Facts</button><button id="brandApprove" class="btn btn-primary">Approve Brand Profile</button><span class="pill">${esc(x.status||'draft')}</span></div></div>`;
  async function save(status){try{const payload={profile_key:'allshield_primary',company_name:$('#brandCompany',main).value.trim()||'Allshield Insurance Group',website_url:$('#brandWebsite',main).value.trim()||null,short_description:$('#brandShort',main).value.trim()||null,mission:$('#brandMission',main).value.trim()||null,brand_voice:$('#brandVoice',main).value.trim()||null,default_cta:$('#brandCTA',main).value.trim()||null,recruiting_message:$('#brandRecruiting',main).value.trim()||null,services:$('#brandServices',main).value.split(/\n+/).map(v=>v.trim()).filter(Boolean),service_areas:$('#brandAreas',main).value.split(/\n+/).map(v=>v.trim()).filter(Boolean),prohibited_claims:$('#brandProhibited',main).value.split(/\n+/).map(v=>v.trim()).filter(Boolean),status,updated_by:u.id,updated_at:new Date().toISOString(),approved_by:status==='approved'?u.id:null,approved_at:status==='approved'?new Date().toISOString():null};const {error}=await c.from('social_brand_profiles').upsert(payload,{onConflict:'profile_key'});if(error)throw error;toastMsg(status==='approved'?'Brand profile approved.':'Brand facts saved.');main.dataset.brandLive='';await renderBrand(main);}catch(e){toastMsg('Brand save failed: '+(e.message||e));}}
  $('#brandSave',main).onclick=()=>save('draft');$('#brandApprove',main).onclick=()=>save('approved');
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
