(() => {
  const sb=window.allshieldSupabase;if(!sb)return;
  const SHIELD='assets/brand-9aa0ec99b3b0.webp';
  const WORDMARK='assets/brand-6553d9469f9e.webp';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attr=v=>esc(v).replace(/`/g,'&#96;');
  const dt=v=>v?new Date(v).toLocaleString():'—';
  const platforms=['facebook','instagram','tiktok','linkedin','youtube','x','threads','pinterest','snapchat','whatsapp','reddit','messenger'];
  const title=s=>String(s||'').replace(/(^|[_-])([a-z])/g,(_,a,b)=>(a?' ':'')+b.toUpperCase()).replace(/^./,m=>m.toUpperCase());

  const css=document.createElement('style');css.id='approved-owner-setup-style';css.textContent=`
    .approved-social-tabs{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 18px}.approved-social-tabs button{border:1px solid #2c4966;background:#10233a;color:#fff;padding:12px 18px;border-radius:12px;font-weight:700;cursor:pointer}.approved-social-tabs button.active{background:linear-gradient(135deg,#5cc0ff,#0877bd);color:#04111e}
    .approved-social-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(330px,.85fr);gap:18px}.approved-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.approved-fields .wide{grid-column:1/-1}.approved-fields label{display:block;margin:0 0 6px;color:#eef5fb}.approved-fields input,.approved-fields textarea{width:100%}.approved-fields textarea{min-height:105px;resize:vertical}.approved-status-list .requirement{padding:14px 0}.approved-brand-lockup{min-height:430px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px}.approved-brand-lockup img:first-child{max-width:270px;width:58%;height:auto}.approved-brand-lockup img:last-child{max-width:460px;width:88%;height:auto}.social-platform-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.social-platform-card{border:1px solid #263d56;border-radius:12px;padding:12px;background:#0c1d30}.social-platform-card strong{display:block}.social-platform-card small{color:#8fa2b8}.queue-row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.08)}.queue-row:last-child{border-bottom:0}
    @media(max-width:980px){.approved-social-grid{grid-template-columns:1fr}.approved-fields{grid-template-columns:1fr}.approved-fields .wide{grid-column:auto}}`;
  document.head.appendChild(css);

  const socialView=`
    <div class="dashboard-head"><div><div class="kicker">SOCIAL PUBLISHING</div><h2>Company social command center.</h2><p>Approved brand source, AI-ready platform profiles, posts, ads, account connections and publishing queue.</p></div><button class="btn btn-primary" onclick="loadApprovedSocialWorkspace()">Refresh</button></div>
    <div class="real-data-banner">LIVE SUPABASE DATA • APPROVED OWNER SETUP</div>
    <div class="approved-social-tabs"><button id="socialTab-brand" class="active" onclick="showApprovedSocialTab('brand')">Brand + Profile AI</button><button id="socialTab-posts" onclick="showApprovedSocialTab('posts')">Posts + Ads</button><button id="socialTab-connections" onclick="showApprovedSocialTab('connections')">Connections + Queue</button></div>
    <div id="approvedSocialHost"><div class="bo-card">Loading approved social workspace…</div></div>`;

  const brandView=`
    <div class="dashboard-head"><div><div class="kicker">BRAND CENTER</div><h2>Approved homepage brand standard.</h2><p>The public homepage is the single source of truth. No alternate back-office logo is allowed.</p></div><button class="btn btn-primary" onclick="loadApprovedBrandCenter()">Refresh</button></div>
    <div class="real-data-banner">APPROVED HOMEPAGE BRAND</div><div id="approvedBrandHost">Loading…</div>`;

  if(window.ownerViews){window.ownerViews.social=socialView;window.ownerViews.brand=brandView;}
  if(window.adminViews)window.adminViews.social=socialView;

  function normalizePortalLogos(){
    document.querySelectorAll('.portal-page .portal-top img,.portal-login img').forEach(img=>{img.src=SHIELD;img.dataset.allshieldApprovedLogo='true'});
  }

  window.loadApprovedBrandCenter=async()=>{
    const h=document.getElementById('approvedBrandHost');if(!h)return;
    const {data}=await sb.from('app_settings').select('setting_value,updated_at').eq('setting_key','branding').maybeSingle();
    h.innerHTML=`<div class="approved-social-grid"><div class="bo-card"><h3>Approved Logo</h3><div class="approved-brand-lockup"><img src="${SHIELD}" alt="Approved Allshield shield"><img src="${WORDMARK}" alt="Approved Allshield Insurance Group wordmark"></div></div><div class="bo-card"><h3>Brand Settings</h3><div class="requirement"><span>Source of truth</span><strong>Homepage</strong></div><div class="requirement"><span>Shield asset</span><small>${esc(SHIELD)}</small></div><div class="requirement"><span>Wordmark asset</span><small>${esc(WORDMARK)}</small></div><div class="requirement"><span>Updated</span><span>${dt(data?.updated_at)}</span></div><p style="color:#8fa2b8;line-height:1.6;margin-top:18px">The former internal A-shield asset is not approved and is no longer used by the Owner, Admin or Agent back office.</p></div></div>`;
    normalizePortalLogos();
  };

  let socialTab='brand';
  window.showApprovedSocialTab=(tab)=>{socialTab=tab;document.querySelectorAll('.approved-social-tabs button').forEach(b=>b.classList.remove('active'));document.getElementById('socialTab-'+tab)?.classList.add('active');loadApprovedSocialWorkspace()};

  async function getBrand(){const {data,error}=await sb.from('social_brand_profiles').select('*').eq('profile_key','allshield_primary').maybeSingle();if(error)throw error;return data;}
  async function getProfiles(){const {data,error}=await sb.from('social_platform_profiles').select('*').order('platform');if(error)throw error;return data||[];}
  async function getConnections(){const [a,c]=await Promise.all([sb.from('social_accounts').select('*').order('platform'),sb.from('social_connections').select('*').order('platform')]);if(a.error||c.error)throw(a.error||c.error);const map=new Map();for(const x of [...(c.data||[]),...(a.data||[])]){const key=String(x.platform||'').toLowerCase();if(!map.has(key)||String(x.status).toLowerCase()==='connected')map.set(key,x)}return [...map.values()]}
  async function getPosts(){const {data,error}=await sb.from('social_posts').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;return data||[]}

  function listText(v){return Array.isArray(v)?v.join('\n'):''}
  function brandForm(b,profiles){
    const approved=profiles.filter(x=>x.status==='approved').length;
    return `<div class="approved-social-grid"><div class="bo-card"><div class="kicker">SOCIAL BRAND SETUP AI</div><h2 style="margin-top:4px">Teach Allshield AI the company once.</h2><p style="color:#b8c6d4;line-height:1.6">Use the approved website and real company facts. AI builds a different bio/About profile for every platform, then uses the approved brand profile whenever it creates future posts and ads.</p><div class="approved-fields">
      <div><label>Company Name</label><input id="sbCompany" class="mini-input" value="${attr(b?.company_name||'Allshield Insurance Group')}"></div>
      <div><label>Website URL</label><input id="sbWebsite" class="mini-input" value="${attr(b?.website_url||'')}" placeholder="https://..."></div>
      <div><label>Brand Voice</label><input id="sbVoice" class="mini-input" value="${attr(b?.brand_voice||'Confident, clear, human, professional, trustworthy and never robotic.')}"></div>
      <div><label>Default CTA</label><input id="sbCta" class="mini-input" value="${attr(b?.default_cta||'')}" placeholder="Example: Learn more / Apply today"></div>
      <div class="wide"><label>Approved Website / Company Source Material</label><textarea id="sbFacts" class="mini-input" placeholder="Paste approved company facts here, or use the current Allshield website.">${esc(typeof b?.approved_facts==='string'?b.approved_facts:JSON.stringify(b?.approved_facts||{},null,2)==='{}'?'':JSON.stringify(b?.approved_facts||{},null,2))}</textarea><div class="row-actions"><button class="tiny-btn" onclick="useCurrentAllshieldWebsite()">Use Current ALLSHIELD Website</button></div></div>
      <div><label>Mission</label><textarea id="sbMission" class="mini-input">${esc(b?.mission||'')}</textarea></div>
      <div><label>Recruiting Message</label><textarea id="sbRecruit" class="mini-input">${esc(b?.recruiting_message||'')}</textarea></div>
      <div><label>Services (comma or line separated)</label><textarea id="sbServices" class="mini-input">${esc(listText(b?.services))}</textarea></div>
      <div><label>Service Areas</label><textarea id="sbAreas" class="mini-input">${esc(listText(b?.service_areas))}</textarea></div>
    </div><div class="row-actions"><button class="btn btn-primary" onclick="saveApprovedBrandProfile()">Save Brand Source</button><button class="tiny-btn" onclick="approveApprovedBrandProfile()">Approve Brand Source</button></div></div>
    <div class="bo-card"><div class="kicker">BRAND STATUS</div><h2 style="margin-top:4px">One approved source of truth</h2><div class="approved-status-list"><div class="requirement"><span>Brand source</span><span class="pill">${esc(String(b?.status||'draft').toUpperCase()==='APPROVED'?'APPROVED':'DRAFT / NEEDS APPROVAL')}</span></div><div class="requirement"><span>Platform profiles generated</span><strong>${profiles.length}/12</strong></div><div class="requirement"><span>Platform profiles approved</span><strong>${approved}/12</strong></div><div class="requirement"><span>AI content context</span><span class="pill">${b?.status==='approved'?'APPROVED BRAND':'DRAFT BRAND'}</span></div></div><div class="bo-card" style="margin-top:16px;background:#0b1b2d"><h3>What AI will do</h3><p style="color:#c4d0dc;line-height:1.7">Facebook About • Instagram bio • TikTok bio • LinkedIn tagline/About • YouTube channel description • X bio • Threads bio • Pinterest business description • Snapchat Public Profile copy • WhatsApp Business description • Reddit profile copy • Messenger greeting/intro.</p></div></div></div>`;
  }

  function postsView(posts,connections){
    const connected=new Set(connections.filter(x=>String(x.status).toLowerCase()==='connected').map(x=>String(x.platform).toLowerCase()));
    return `<div class="approved-social-grid"><div class="bo-card"><div class="kicker">POSTS + ADS</div><h2 style="margin-top:4px">Create from the approved company voice.</h2><textarea id="approvedSocialCopy" class="mini-input" style="min-height:190px" placeholder="Write a post or ad draft..."></textarea><div class="row-actions"><button class="tiny-btn" onclick="approvedSocialAIRewrite()">AI Polish</button></div><div class="social-platform-grid" style="margin-top:14px">${platforms.map(p=>`<label class="social-platform-card"><input type="checkbox" data-approved-destination="${p}" ${connected.has(p)?'':'disabled'}> <strong>${title(p)}</strong><small>${connected.has(p)?'Connected':'Connect account before publishing'}</small></label>`).join('')}</div><div class="row-actions"><button class="tiny-btn" onclick="saveApprovedSocialPost('draft')">Save Draft</button><button class="tiny-btn" onclick="saveApprovedSocialPost('scheduled')">Schedule</button><button class="btn btn-primary" onclick="saveApprovedSocialPost('queued')">Queue for Publishing</button></div></div><div class="bo-card"><div class="kicker">LIVE QUEUE</div><h3>Recent posts</h3>${posts.slice(0,12).map(x=>`<div class="queue-row"><span><strong>${esc((x.body||'').slice(0,85)||'(No copy)')}</strong><small style="display:block;color:#8fa2b8">${esc((x.destinations||[]).join(', ')||'No destinations')} • ${dt(x.scheduled_for||x.created_at)}</small></span><span class="pill">${esc(x.status)}</span></div>`).join('')||'<p>No live posts yet.</p>'}</div></div>`;
  }

  function connectionsView(connections,posts){
    return `<div class="approved-social-grid"><div class="bo-card"><div class="kicker">CONNECTIONS</div><h2 style="margin-top:4px">Company accounts.</h2>${platforms.map(p=>{const x=connections.find(c=>String(c.platform).toLowerCase()===p);return `<div class="requirement"><span><strong>${title(p)}</strong><small style="display:block;color:#8fa2b8">${esc(x?.account_name||x?.account_label||'No company account connected')}</small></span><span class="pill">${esc(x?.status||'not connected')}</span></div>`}).join('')}</div><div class="bo-card"><div class="kicker">PUBLISHING QUEUE</div><h3>Current status</h3><div class="requirement"><span>Connected accounts</span><strong>${connections.filter(x=>String(x.status).toLowerCase()==='connected').length}</strong></div><div class="requirement"><span>Queued</span><strong>${posts.filter(x=>x.status==='queued').length}</strong></div><div class="requirement"><span>Scheduled</span><strong>${posts.filter(x=>x.status==='scheduled').length}</strong></div><div class="requirement"><span>Published</span><strong>${posts.filter(x=>x.status==='published').length}</strong></div>${posts.slice(0,15).map(x=>`<div class="queue-row"><span>${esc((x.body||'').slice(0,70)||'(No copy)')}</span><span class="pill">${esc(x.status)}</span></div>`).join('')}</div></div>`;
  }

  window.loadApprovedSocialWorkspace=async()=>{
    const h=document.getElementById('approvedSocialHost');if(!h)return;h.innerHTML='<div class="bo-card">Loading live social workspace…</div>';
    try{
      const [b,profiles,connections,posts]=await Promise.all([getBrand(),getProfiles(),getConnections(),getPosts()]);
      h.innerHTML=socialTab==='brand'?brandForm(b,profiles):socialTab==='posts'?postsView(posts,connections):connectionsView(connections,posts);
    }catch(e){h.innerHTML=`<div class="bo-card">${esc(e.message||e)}</div>`}
  };

  const split=v=>String(v||'').split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);
  window.useCurrentAllshieldWebsite=()=>{const el=document.getElementById('sbWebsite');if(el&&!el.value)el.value='https://allshieldinsurancegroup.com';const facts=document.getElementById('sbFacts');if(facts&&!facts.value)facts.value='Use the current approved public Allshield Insurance Group website as source material. Only verified company facts may be used.';};
  window.saveApprovedBrandProfile=async()=>{try{const {data:u}=await sb.auth.getUser();const current=await getBrand();const row={profile_key:'allshield_primary',company_name:document.getElementById('sbCompany')?.value.trim()||'Allshield Insurance Group',website_url:document.getElementById('sbWebsite')?.value.trim()||null,brand_voice:document.getElementById('sbVoice')?.value.trim()||null,default_cta:document.getElementById('sbCta')?.value.trim()||null,mission:document.getElementById('sbMission')?.value.trim()||null,recruiting_message:document.getElementById('sbRecruit')?.value.trim()||null,services:split(document.getElementById('sbServices')?.value),service_areas:split(document.getElementById('sbAreas')?.value),approved_facts:{source_material:document.getElementById('sbFacts')?.value.trim()||''},status:current?.status==='approved'?'approved':'draft',updated_by:u.user?.id,updated_at:new Date().toISOString()};let r;if(current?.id)r=await sb.from('social_brand_profiles').update(row).eq('id',current.id);else r=await sb.from('social_brand_profiles').insert(row);if(r.error)throw r.error;toast('Brand source saved.');await loadApprovedSocialWorkspace()}catch(e){alert(e.message||e)}};
  window.approveApprovedBrandProfile=async()=>{try{const {data:u}=await sb.auth.getUser();const current=await getBrand();if(!current?.id)throw new Error('Save the brand source first.');const {error}=await sb.from('social_brand_profiles').update({status:'approved',approved_by:u.user?.id,approved_at:new Date().toISOString(),updated_by:u.user?.id,updated_at:new Date().toISOString()}).eq('id',current.id);if(error)throw error;toast('Brand source approved.');await loadApprovedSocialWorkspace()}catch(e){alert(e.message||e)}};
  window.approvedSocialAIRewrite=async()=>{const el=document.getElementById('approvedSocialCopy');if(!el||!el.value.trim())return toast('Write a post first.');if(typeof window.allshieldAIPolishField==='function')return window.allshieldAIPolishField('approvedSocialCopy','polished');toast('AI service is loading.');};
  window.saveApprovedSocialPost=async(status)=>{try{const {data:u}=await sb.auth.getUser();const body=document.getElementById('approvedSocialCopy')?.value.trim()||'';if(!body)return toast('Write the post first.');const destinations=[...document.querySelectorAll('[data-approved-destination]:checked')].map(x=>x.dataset.approvedDestination);let scheduled_for=null;if(status==='scheduled'){const raw=prompt('Schedule date/time (example: 2026-08-26 09:00):');if(!raw)return;const d=new Date(raw);if(Number.isNaN(d.getTime()))throw new Error('Enter a valid date and time.');scheduled_for=d.toISOString()}if(status!=='draft'&&!destinations.length)throw new Error('Select at least one connected platform.');const {error}=await sb.from('social_posts').insert({created_by:u.user?.id,body,destinations,status,scheduled_for,media:[],platform_results:{source:'approved_owner_workspace'}});if(error)throw error;toast(status==='draft'?'Draft saved.':status==='scheduled'?'Post scheduled.':'Post queued.');await loadApprovedSocialWorkspace()}catch(e){alert(e.message||e)}};

  function hook(name,loaders){const old=window[name];if(typeof old!=='function')return;window[name]=function(view,el){const out=old(view,el);setTimeout(()=>{if(view==='social')loadApprovedSocialWorkspace();if(view==='brand')loadApprovedBrandCenter();normalizePortalLogos();},30);return out}}
  hook('showOwnerView');hook('showAdminView');
  normalizePortalLogos();
  window.__allshieldApprovedOwnerSetup=true;
})();
