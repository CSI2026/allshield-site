function openLead(){document.getElementById('leadModal')?.classList.add('show')}
function closeLead(){document.getElementById('leadModal')?.classList.remove('show')}
function openCareer(){document.getElementById('careerModal')?.classList.add('show')}
function closeCareer(){document.getElementById('careerModal')?.classList.remove('show')}
function openPortalChooser(){document.getElementById('portalChooser')?.classList.add('show')}
function closePortalChooser(){document.getElementById('portalChooser')?.classList.remove('show')}

function hideSite(){
  const shell=document.querySelector('.shell');
  if(shell)shell.style.display='none';
  closeLead();
  closePortalChooser();
}
function showLogin(role){
  hideSite();
  document.getElementById(role+'Login')?.classList.add('show');
}
function enterPortal(role){
  ['agent','admin','owner'].forEach(r=>document.getElementById(r+'Login')?.classList.remove('show'));
  ['agent','admin','owner'].forEach(r=>document.getElementById(r+'Portal')?.classList.remove('show'));
  document.getElementById(role+'Portal')?.classList.add('show');
}
function returnHome(){
  ['agent','admin','owner'].forEach(r=>document.getElementById(r+'Login')?.classList.remove('show'));
  ['agent','admin','owner'].forEach(r=>document.getElementById(r+'Portal')?.classList.remove('show'));
  document.getElementById('careersPage')?.classList.remove('show');
  const shell=document.querySelector('.shell');
  if(shell)shell.style.display='block';
  window.scrollTo({top:0,behavior:'smooth'});
}

const unavailable=(title)=>`<div class="dashboard-head"><div><div class="kicker">ALLSHIELD LIVE PLATFORM</div><h2>${title}</h2><p>This module is loading its live production service.</p></div></div><div class="bo-card">Live data is not available yet. Refresh the page or open System Health if this message remains.</div>`;

const agentViews={
  dashboard:unavailable('Agent Dashboard'),ai:unavailable('AI Assistant'),onboarding:unavailable('Onboarding'),licensing:unavailable('Licensing Center'),study:unavailable('Licensing Academy'),tests:unavailable('Practice Tests'),performance:unavailable('Performance & Rankings'),documents:unavailable('Documents & E-Sign'),meetings:unavailable('Meeting Rooms'),achievements:unavailable('Achievements'),careerpath:unavailable('Career Path'),production:unavailable('Production'),communications:unavailable('Communications'),resources:unavailable('Resources'),profile:unavailable('Profile & Settings')
};
const adminViews={
  dashboard:unavailable('Executive Dashboard'),ai:unavailable('AI Operations'),team:unavailable('Team & Roles'),hierarchy:unavailable('Hierarchy & Promotions'),onboarding:unavailable('Onboarding Control'),courses:unavailable('Academy Control'),licensing:unavailable('Licensing Oversight'),tests:unavailable('Tests & Scoring'),documents:unavailable('Documents'),meetings:unavailable('Meeting Rooms'),production:unavailable('Production'),leaderboard:unavailable('Rankings & Bonuses'),communications:unavailable('Communications'),automations:unavailable('Automation Center'),marketing:unavailable('Marketing Center'),social:unavailable('Social Publishing'),video:unavailable('Video Studio'),media:unavailable('Media Studio'),settings:unavailable('System Settings')
};
const ownerViews={
  dashboard:unavailable('Owner Dashboard'),ai:unavailable('AI Command Center'),permissions:unavailable('Roles & Permissions'),teamaccounts:unavailable('Team Accounts'),departments:unavailable('Departments & Access'),communications:unavailable('Company Communications'),hierarchy:unavailable('Organization & Promotion Ladder'),states:unavailable('State Licensing Matrix'),academy:unavailable('Academy Governance'),versions:unavailable('Content Versioning'),updates:unavailable('Platform Update Center'),performance:unavailable('Company Performance'),meetings:unavailable('Meeting Governance'),marketing:unavailable('Corporate Marketing Center'),social:unavailable('Social Publishing'),video:unavailable('Video & YouTube Studio'),media:unavailable('Media Studio'),brand:unavailable('Brand Center'),files:unavailable('Owner File Vault'),audit:unavailable('Audit & Change History'),settings:unavailable('Global Settings'),health:unavailable('System Health')
};

function setActive(el){
  if(!el)return;
  el.parentElement?.querySelectorAll('.side-link').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
}
function renderPortalView(type,view,el){
  setActive(el);
  const registry=type==='agent'?agentViews:type==='admin'?adminViews:ownerViews;
  const host=document.getElementById(type+'Main');
  if(!host)return false;
  host.innerHTML=registry[view]||unavailable(String(view||'Requested Module'));
  return true;
}
function showAgentView(view,el){return renderPortalView('agent',view,el)}
function showAdminView(view,el){return renderPortalView('admin',view,el)}
function showOwnerView(view,el){return renderPortalView('owner',view,el)}

function toast(msg){
  const t=document.getElementById('demoToast');
  if(!t)return;
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}
function togglePlatform(el){el?.classList.toggle('on')}
function filterResources(q){
  q=String(q||'').toLowerCase();
  document.querySelectorAll('#resourceList .resource').forEach(r=>r.style.display=String(r.dataset.res||'').includes(q)?'flex':'none');
}

function openCareersPage(){
  hideSite();
  ['agent','admin','owner'].forEach(r=>document.getElementById(r+'Portal')?.classList.remove('show'));
  document.getElementById('careersPage')?.classList.add('show');
  window.scrollTo(0,0);
}
function closeCareersPage(){returnHome()}

function submitLead(){toast('Secure request service is loading. Please try again in a moment.')}
function submitCareer(){toast('Secure career service is loading. Please try again in a moment.')}

document.getElementById('leadModal')?.addEventListener('click',e=>{if(e.target.id==='leadModal')closeLead()});
