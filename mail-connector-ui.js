(() => {
  const sb = window.allshieldSupabase;
  if (!sb) return;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const when = d => d ? new Date(d).toLocaleString() : '—';
  const aliases = {
    info:'info@allshieldinsurancegroup.com',
    onboarding:'onboarding@allshieldinsurancegroup.com',
    licensing:'licensing@allshieldinsurancegroup.com',
    support:'support@allshieldinsurancegroup.com',
    payroll:'payroll@allshieldinsurancegroup.com',
    compliance:'compliance@allshieldinsurancegroup.com',
    careers:'careers@allshieldinsurancegroup.com'
  };

  async function invokeMail(action, payload={}) {
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Sign in to the Allshield back office first.');
    const cfg = window.ALLSHIELD_CONFIG || {};
    const res = await fetch(`${cfg.SUPABASE_URL}/functions/v1/ionos-mail`, {
      method: 'POST',
      headers: {'Content-Type':'application/json',apikey:cfg.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`},
      body: JSON.stringify({ action, ...payload })
    });
    const raw = await res.text();
    let data={}; try{data=raw?JSON.parse(raw):{}}catch{data={error:raw}}
    if(!res.ok||data.error) throw new Error(data.error||`Mail service error ${res.status}`);
    return data;
  }

  async function syncNow(){
    const btn=document.getElementById('mailSyncBtn'); if(btn){btn.disabled=true;btn.textContent='Syncing…'}
    try{const r=await invokeMail('sync'); window.toast?.(`Mail synced • ${r.inserted||0} new`); await loadMailboxHub();}
    catch(e){alert(e.message||e)} finally{if(btn){btn.disabled=false;btn.textContent='Sync Now'}}
  }
  window.syncAllshieldMail=syncNow;

  function composer(thread=null){
    const dept=thread?.department_key||'info';
    const from=aliases[dept]||aliases.info;
    return `<div class="bo-card" style="margin-bottom:18px"><h3>${thread?'Reply':'New Message'}</h3><div class="form-grid"><select id="mailFrom" class="mini-input">${Object.entries(aliases).map(([k,v])=>`<option value="${esc(v)}" ${v===from?'selected':''}>${esc(v)}</option>`).join('')}</select><input id="mailTo" class="mini-input" placeholder="Recipient" value="${esc(thread?.contact_email||'')}"><input id="mailSubject" class="mini-input" placeholder="Subject" value="${esc(thread?`Re: ${thread.subject||''}`:'')}"></div><textarea id="mailBody" class="mini-input" style="width:100%;min-height:150px;margin-top:10px" placeholder="Write your message"></textarea><div class="row-actions"><button class="btn btn-primary" onclick="sendAllshieldMail('${thread?.id||''}')">Send</button></div></div>`;
  }

  window.sendAllshieldMail=async(threadId='')=>{
    const to=document.getElementById('mailTo')?.value?.trim(),subject=document.getElementById('mailSubject')?.value?.trim(),text=document.getElementById('mailBody')?.value||'',from=document.getElementById('mailFrom')?.value;
    if(!to||!subject||!text.trim()) return alert('Recipient, subject and message are required.');
    try{await invokeMail('send',{to,subject,text,from_address:from,thread_id:threadId||null});window.toast?.('Email sent.');if(threadId)await openMailThread(threadId);else await loadMailboxHub()}
    catch(e){alert(e.message||e)}
  };

  async function openMailThread(id){
    const host=document.getElementById('mailboxHubHost'); if(!host)return;
    const [{data:t,error:te},{data:m,error:me}] = await Promise.all([
      sb.from('email_threads').select('*').eq('id',id).single(),
      sb.from('email_messages').select('*').eq('thread_id',id).order('sent_at',{ascending:true})
    ]);
    if(te||me){host.textContent=(te||me).message;return}
    await sb.from('email_threads').update({unread_count:0,updated_at:new Date().toISOString()}).eq('id',id);
    host.innerHTML=`<div class="row-actions" style="margin-bottom:12px"><button class="tiny-btn" onclick="loadMailboxHub()">← Inbox</button><button class="tiny-btn" onclick="syncAllshieldMail()">Sync</button></div><div class="bo-card"><div class="kicker">${esc(t.department_key||'info').toUpperCase()}</div><h3>${esc(t.subject)}</h3><p>${esc(t.contact_email||'')}</p></div><div style="margin-top:14px">${(m||[]).map(x=>`<div class="bo-card" style="margin-bottom:10px;border-left:4px solid ${x.direction==='outbound'?'#69b9f1':'#c7d5e4'}"><div class="requirement"><span><strong>${esc(x.direction==='outbound'?x.from_address:x.from_address||'Unknown')}</strong></span><span>${when(x.sent_at)}</span></div><div style="white-space:pre-wrap;line-height:1.6;margin-top:8px">${esc(x.body_text||'(No text body)')}</div></div>`).join('')}</div>${composer(t)}`;
  }
  window.openMailThread=openMailThread;

  window.loadMailboxHub=async()=>{
    const host=document.getElementById('mailboxHubHost'); if(!host)return;
    host.innerHTML='<div class="bo-card">Loading communications…</div>';
    try{
      const [{data:box,error:be},{data:threads,error:te},{data:runs}] = await Promise.all([
        sb.from('shared_mailboxes').select('*').eq('mailbox_key','info').single(),
        sb.from('email_threads').select('*').order('last_message_at',{ascending:false}).limit(150),
        sb.from('mail_sync_runs').select('status,fetched_count,inserted_count,error_text,completed_at').order('started_at',{ascending:false}).limit(1)
      ]);
      if(be||te)throw(be||te);
      const list=threads||[]; const totalUnread=list.reduce((s,x)=>s+Number(x.unread_count||0),0); const last=runs?.[0];
      const groups=['all','info','onboarding','licensing','support','payroll','compliance','careers'];
      host.innerHTML=`<div class="stat-grid"><div class="stat"><div class="label">Mailbox</div><div class="value" style="font-size:18px">${esc(box.email_address)}</div></div><div class="stat"><div class="label">Unread</div><div class="value">${totalUnread}</div></div><div class="stat"><div class="label">Last Sync</div><div class="value" style="font-size:16px">${last?.completed_at?when(last.completed_at):'Never'}</div></div><div class="stat"><div class="label">Sync Health</div><div class="value" style="font-size:18px">${esc(last?.status||'Ready')}</div></div></div><div class="row-actions" style="margin:16px 0"><button id="mailSyncBtn" class="btn btn-primary" onclick="syncAllshieldMail()">Sync Now</button><button class="btn btn-ghost" onclick="showMailComposer()">New Message</button></div><div id="mailComposer"></div><div class="bo-card"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${groups.map(g=>`<button class="tiny-btn" onclick="filterMail('${g}')">${g==='all'?'All':g[0].toUpperCase()+g.slice(1)}</button>`).join('')}</div><div id="mailThreadList">${renderThreads(list,'all')}</div></div>`;
      window.__allshieldMailThreads=list;
    }catch(e){host.textContent=e.message||e}
  };

  function renderThreads(list,dept){
    const rows=dept==='all'?list:list.filter(x=>(x.department_key||'info')===dept);
    return rows.length?rows.map(t=>`<div class="resource" style="cursor:pointer" onclick="openMailThread('${t.id}')"><span><strong>${esc(t.subject||'(No subject)')}</strong><br><small>${esc(t.contact_email||'')} • ${esc(t.department_key||'info')} • ${when(t.last_message_at)}</small></span><span>${t.unread_count?`<span class="pill">${t.unread_count} new</span>`:'<span class="pill">Read</span>'}</span></div>`).join(''):'<p>No messages in this view.</p>';
  }
  window.filterMail=dept=>{const el=document.getElementById('mailThreadList');if(el)el.innerHTML=renderThreads(window.__allshieldMailThreads||[],dept)};
  window.showMailComposer=()=>{const el=document.getElementById('mailComposer');if(el)el.innerHTML=composer(null)};
})();
