(() => {
  const sb = window.allshieldSupabase;
  if (!sb) return;

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dt = (v) => v ? new Date(v).toLocaleString() : "—";
  async function me(){ const {data}=await sb.auth.getUser(); return data.user; }
  async function myProfile(){ const u=await me(); if(!u)return null; const {data}=await sb.from('profiles').select('id,username,first_name,last_name,role,department_id').eq('id',u.id).single(); return data; }

  const commView = `
    <div class="dashboard-head"><div><div class="kicker">COMPANY COMMUNICATIONS</div><h2>Messages inside Allshield.</h2><p>Send direct or department messages and keep an internal record.</p></div><button class="btn btn-primary" onclick="loadLiveMessages()">Refresh</button></div>
    <div class="real-data-banner">LIVE SUPABASE DATA</div>
    <div class="bo-grid"><div class="bo-card"><h3>Compose Message</h3><select id="msgRecipient" class="mini-input"><option value="">Choose recipient…</option></select><input id="msgSubject" class="mini-input" style="margin-top:10px" placeholder="Subject"><textarea id="msgBody" class="mini-input" style="height:120px;margin-top:10px" placeholder="Message"></textarea><div class="row-actions"><button class="btn btn-primary" onclick="sendLiveMessage()">Send Message</button></div></div><div class="bo-card"><h3>Inbox</h3><div id="liveInbox">Loading…</div></div></div>
    <div class="bo-card" style="margin-top:18px"><h3>Sent</h3><div id="liveSent">Loading…</div></div>`;

  const meetingsView = `
    <div class="dashboard-head"><div><div class="kicker">MEETING ROOMS</div><h2>Training and company meetings.</h2><p>Upcoming sessions, attendance and secure meeting links.</p></div><button class="btn btn-primary" onclick="loadLiveMeetings()">Refresh</button></div>
    <div class="real-data-banner">LIVE SUPABASE DATA</div><div id="liveMeetings">Loading…</div>`;

  const documentsView = `
    <div class="dashboard-head"><div><div class="kicker">DOCUMENTS & ACKNOWLEDGMENTS</div><h2>Required company documents.</h2><p>Review, acknowledge and retain a timestamped company record.</p></div><button class="btn btn-primary" onclick="loadLiveDocuments()">Refresh</button></div>
    <div class="real-data-banner">LIVE SUPABASE DATA</div><div id="liveDocuments">Loading…</div>`;

  if (window.agentViews) {
    agentViews.communications = commView;
    agentViews.meetings = meetingsView;
    agentViews.documents = documentsView;
  }

  if (window.adminViews) {
    adminViews.communications = commView;
    adminViews.meetings = `
      <div class="dashboard-head"><div><div class="kicker">MEETING CONTROL</div><h2>Schedule company training.</h2><p>Create meeting records and publish join links to the appropriate audience.</p></div><button class="btn btn-primary" onclick="loadLiveMeetings()">Refresh</button></div>
      <div class="real-data-banner">LIVE SUPABASE DATA</div>
      <div class="bo-grid"><div class="bo-card"><h3>Schedule Meeting</h3><input id="meetTitle" class="mini-input" placeholder="Meeting title"><textarea id="meetDesc" class="mini-input" style="height:90px;margin-top:10px" placeholder="Description"></textarea><div class="form-grid" style="margin-top:10px"><div><label>Starts</label><input id="meetStart" type="datetime-local" class="mini-input"></div><div><label>Ends</label><input id="meetEnd" type="datetime-local" class="mini-input"></div><div><label>Audience</label><select id="meetAudience" class="mini-input"><option value="all">All Team</option><option value="agent">Agents</option><option value="manager">Managers</option><option value="admin">Admins</option></select></div><div><label>Join URL</label><input id="meetUrl" class="mini-input" placeholder="https://..."></div></div><div class="row-actions"><button class="btn btn-primary" onclick="createLiveMeeting()">Schedule Meeting</button></div></div><div class="bo-card"><h3>Upcoming Meetings</h3><div id="liveMeetings">Loading…</div></div></div>`;
    adminViews.documents = `
      <div class="dashboard-head"><div><div class="kicker">DOCUMENT CONTROL</div><h2>Publish required acknowledgments.</h2><p>Versioned internal documents with signature tracking.</p></div><button class="btn btn-primary" onclick="loadAdminDocuments()">Refresh</button></div>
      <div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-grid"><div class="bo-card"><h3>Published Documents</h3><div id="adminDocumentList">Loading…</div></div><div class="bo-card"><h3>Signature Status</h3><div id="adminSignatureStatus">Loading…</div></div></div>`;
  }

  if (window.ownerViews) {
    ownerViews.communications = commView;
    ownerViews.meetings = adminViews?.meetings || meetingsView;
  }

  async function loadRecipients(){
    const sel=document.getElementById('msgRecipient'); if(!sel)return;
    const [people,deps]=await Promise.all([sb.from('profiles').select('id,username,first_name,last_name,role,status').neq('status','terminated').order('last_name'),sb.from('departments').select('id,name').order('name')]);
    const p=(people.data||[]).map(x=>`<option value="user:${x.id}">${esc((((x.first_name||'')+' '+(x.last_name||'')).trim()||x.username||'Team member'))} • ${esc(x.role)}</option>`).join('');
    const d=(deps.data||[]).map(x=>`<option value="department:${x.id}">Department • ${esc(x.name)}</option>`).join('');
    sel.innerHTML='<option value="">Choose recipient…</option>'+p+d;
  }

  window.sendLiveMessage=async()=>{
    const u=await me(); if(!u)return;
    const target=document.getElementById('msgRecipient')?.value||'';
    const subject=document.getElementById('msgSubject')?.value.trim()||'';
    const body=document.getElementById('msgBody')?.value.trim()||'';
    if(!target||!body){alert('Choose a recipient and enter a message.');return}
    const [kind,id]=target.split(':');
    const row={sender_id:u.id,recipient_user_id:kind==='user'?id:null,recipient_department_id:kind==='department'?id:null,subject:subject||null,body};
    const {error}=await sb.from('internal_messages').insert(row); if(error){alert(error.message);return}
    document.getElementById('msgSubject').value='';document.getElementById('msgBody').value='';
    await loadLiveMessages(); toast('Message sent.');
  };

  window.loadLiveMessages=async()=>{
    const u=await me(); if(!u)return;
    await loadRecipients();
    const {data,error}=await sb.from('internal_messages').select('id,sender_id,recipient_user_id,recipient_department_id,subject,body,created_at,read_at').order('created_at',{ascending:false}).limit(100);
    if(error){const a=document.getElementById('liveInbox');if(a)a.textContent=error.message;return}
    const ids=[...new Set((data||[]).flatMap(x=>[x.sender_id,x.recipient_user_id]).filter(Boolean))];
    let people={}; if(ids.length){const {data:p}=await sb.from('profiles').select('id,username,first_name,last_name').in('id',ids);people=Object.fromEntries((p||[]).map(x=>[x.id,((x.first_name||'')+' '+(x.last_name||'')).trim()||x.username||'Team member']))}
    const inbox=(data||[]).filter(x=>x.sender_id!==u.id), sent=(data||[]).filter(x=>x.sender_id===u.id);
    const render=(rows,inboxMode)=>rows.map(x=>`<div class="resource" style="align-items:flex-start"><div><strong>${esc(x.subject||'(No subject)')}</strong><div class="meta">${inboxMode?'From '+esc(people[x.sender_id]||'Team member'):'Sent '+dt(x.created_at)}</div><p style="margin:6px 0 0;color:#9eb1c5">${esc(x.body)}</p></div>${inboxMode&&!x.read_at?`<button class="tiny-btn" onclick="markLiveMessageRead('${x.id}')">Mark Read</button>`:'<span class="pill">'+(x.read_at?'Read':'Sent')+'</span>'}</div>`).join('')||'<p>No messages yet.</p>';
    const a=document.getElementById('liveInbox'),b=document.getElementById('liveSent'); if(a)a.innerHTML=render(inbox,true);if(b)b.innerHTML=render(sent,false);
  };

  window.markLiveMessageRead=async(id)=>{const {error}=await sb.from('internal_messages').update({read_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);await loadLiveMessages()};

  window.loadLiveMeetings=async()=>{
    const el=document.getElementById('liveMeetings'); if(!el)return;
    const {data,error}=await sb.from('meetings').select('id,title,description,starts_at,ends_at,join_url,audience,status').neq('status','cancelled').order('starts_at',{ascending:true}).limit(50);
    if(error){el.textContent=error.message;return}
    el.innerHTML=(data||[]).map(m=>`<div class="bo-card" style="margin-bottom:14px"><div class="dashboard-head"><div><h3>${esc(m.title)}</h3><p>${dt(m.starts_at)}${m.ends_at?' → '+dt(m.ends_at):''}</p></div><span class="pill">${esc(m.status)}</span></div><p style="color:#9eb1c5">${esc(m.description||'')}</p><div class="row-actions">${m.join_url?`<button class="btn btn-primary" onclick="joinLiveMeeting('${m.id}','${esc(m.join_url)}')">Join Meeting</button>`:'<span class="pill">Join link pending</span>'}</div></div>`).join('')||'<div class="bo-card">No meetings scheduled.</div>';
  };

  window.joinLiveMeeting=async(id,url)=>{const u=await me();if(!u)return;await sb.from('meeting_attendance').upsert({meeting_id:id,user_id:u.id,joined_at:new Date().toISOString(),status:'attended'},{onConflict:'meeting_id,user_id'});window.open(url,'_blank','noopener');};

  window.createLiveMeeting=async()=>{
    const p=await myProfile();if(!p||!['owner','admin'].includes(p.role)){alert('Admin access required.');return}
    const title=meetTitle.value.trim(), starts=meetStart.value; if(!title||!starts){alert('Enter a title and start time.');return}
    const row={title,description:meetDesc.value.trim()||null,starts_at:new Date(starts).toISOString(),ends_at:meetEnd.value?new Date(meetEnd.value).toISOString():null,join_url:meetUrl.value.trim()||null,audience:meetAudience.value,status:'scheduled',created_by:p.id};
    const {error}=await sb.from('meetings').insert(row);if(error){alert(error.message);return}await loadLiveMeetings();toast('Meeting scheduled.');
  };

  window.loadLiveDocuments=async()=>{
    const u=await me(); if(!u)return; const el=document.getElementById('liveDocuments');if(!el)return;
    const [dRes,sRes]=await Promise.all([sb.from('document_templates').select('id,title,category,body,version,requires_signature,effective_at').eq('status','published').order('effective_at',{ascending:false}),sb.from('document_signatures').select('document_id,typed_name,signed_at').eq('user_id',u.id)]);
    if(dRes.error||sRes.error){el.textContent=(dRes.error||sRes.error).message;return}
    const signed=Object.fromEntries((sRes.data||[]).map(x=>[x.document_id,x]));
    el.innerHTML=(dRes.data||[]).map(d=>{const s=signed[d.id];return `<div class="bo-card" style="margin-bottom:16px"><div class="dashboard-head"><div><h3>${esc(d.title)}</h3><p>${esc(d.category)} • Version ${d.version}</p></div>${s?'<span class="pill">Signed '+dt(s.signed_at)+'</span>':'<span class="pill">Action Required</span>'}</div><p style="color:#a8b8c9;line-height:1.7">${esc(d.body)}</p>${!s&&d.requires_signature?`<div class="form-grid"><div><label>Type your full legal name</label><input id="sig_${d.id}" class="mini-input" placeholder="Full name"></div></div><div class="row-actions"><button class="btn btn-primary" onclick="signLiveDocument('${d.id}')">Acknowledge & Sign</button></div>`:''}</div>`}).join('')||'<div class="bo-card">No published documents assigned.</div>';
  };

  window.signLiveDocument=async(id)=>{const u=await me();if(!u)return;const input=document.getElementById('sig_'+id);const name=input?.value.trim()||'';if(name.length<3){alert('Type your full name to sign.');return}const {error}=await sb.from('document_signatures').insert({document_id:id,user_id:u.id,typed_name:name,signature_payload:{method:'typed_acknowledgment',user_agent:navigator.userAgent},acknowledged:true});if(error){alert(error.message);return}await window.allshieldSaveOnboardingStep('standards',true,{source:'document_signature',document_id:id});await loadLiveDocuments();toast('Document signed and recorded.');};

  window.loadAdminDocuments=async()=>{
    const [docs,sigs,people]=await Promise.all([sb.from('document_templates').select('id,title,version,status,required_roles,effective_at').order('created_at',{ascending:false}),sb.from('document_signatures').select('document_id,user_id,signed_at'),sb.from('profiles').select('id,role,status').neq('status','terminated')]);
    const a=document.getElementById('adminDocumentList'),b=document.getElementById('adminSignatureStatus');if(!a||!b)return;
    if(docs.error||sigs.error||people.error){a.textContent=(docs.error||sigs.error||people.error).message;return}
    a.innerHTML=(docs.data||[]).map(d=>`<div class="resource"><span>${esc(d.title)} • v${d.version}</span><span class="pill">${esc(d.status)}</span></div>`).join('')||'<p>No documents.</p>';
    b.innerHTML=(docs.data||[]).map(d=>{const eligible=(people.data||[]).filter(p=>d.required_roles.includes(p.role));const signed=new Set((sigs.data||[]).filter(s=>s.document_id===d.id).map(s=>s.user_id));return `<div class="requirement"><span>${esc(d.title)}</span><span>${signed.size}/${eligible.length} signed</span></div>`}).join('')||'<p>No signature requirements.</p>';
  };

  function hook(originalName,viewLoaders){
    const original=window[originalName]; if(typeof original!=='function')return;
    window[originalName]=function(view,el){original(view,el);setTimeout(()=>{const fn=viewLoaders[view];if(fn)fn()},40)};
  }
  hook('showAgentView',{communications:loadLiveMessages,meetings:loadLiveMeetings,documents:loadLiveDocuments});
  hook('showAdminView',{communications:loadLiveMessages,meetings:loadLiveMeetings,documents:loadAdminDocuments});
  hook('showOwnerView',{communications:loadLiveMessages,meetings:loadLiveMeetings});
})();
