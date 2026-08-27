(()=>{
'use strict';
const VERSION='2026.08.26.009';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function injectStyles(){
  if(document.getElementById('allshieldProductionPolish009'))return;
  const s=document.createElement('style');
  s.id='allshieldProductionPolish009';
  s.textContent=`
  .career-sizzle-placeholder{margin:0;background:linear-gradient(135deg,#07111f,#0d2744);color:#fff;padding:72px 0;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08)}
  .career-sizzle-card{display:grid;grid-template-columns:1.05fr .95fr;gap:30px;align-items:center;padding:32px;border-radius:26px;border:1px solid rgba(255,255,255,.11);background:linear-gradient(145deg,rgba(13,38,66,.9),rgba(7,17,31,.94));box-shadow:0 24px 70px rgba(0,0,0,.28)}
  .career-sizzle-card h2{font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:1.02;margin:8px 0 13px;letter-spacing:-.03em}
  .career-sizzle-card p{color:#aebfd0;line-height:1.65;margin:0;max-width:620px}
  .career-sizzle-frame{aspect-ratio:16/9;border-radius:20px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 50% 40%,rgba(78,169,235,.18),transparent 35%),#06101d;display:grid;place-items:center;text-align:center;padding:22px}
  .career-sizzle-play{width:66px;height:66px;border-radius:50%;display:grid;place-items:center;margin:0 auto 12px;background:linear-gradient(145deg,#77c8ff,#1b71b5);font-size:28px;box-shadow:0 15px 35px rgba(35,127,199,.32)}
  .career-sizzle-frame strong{display:block;font-size:15px}.career-sizzle-frame span{display:block;color:#7890a8;font-size:11px;margin-top:6px}
  .career-form-status{min-height:22px;margin:10px 0 2px;font-size:12px;color:#9eb1c5;line-height:1.45}
  .career-path-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0 16px}
  .career-path-option{border:1px solid rgba(255,255,255,.12);background:#09182a;color:#dce7f2;border-radius:15px;padding:14px;text-align:left;cursor:pointer;min-height:82px}
  .career-path-option.active{border-color:#67bcf3;background:#102a45;box-shadow:inset 0 0 0 1px rgba(103,188,243,.18)}
  .career-path-option strong{display:block;font-size:13px;margin-bottom:4px}.career-path-option span{font-size:10px;color:#8fa4b9;line-height:1.35}
  .career-conditional{display:none}.career-conditional.show{display:block}
  .career-consent{display:flex;gap:9px;align-items:flex-start;padding:11px 0;color:#8ea2b7;font-size:11px;line-height:1.45}.career-consent input{margin-top:2px;flex:0 0 auto}
  .mobile-hero-company-logo{display:none}
  @media(max-width:820px){
    .shell{padding-bottom:0!important}
    .public-app-dock{display:none!important}
    .hero .trust-row{display:none!important}
    .mobile-hero-company-logo{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;margin:2px auto 19px;width:100%}
    .mobile-hero-company-logo .mh-shield{width:76px;height:auto;filter:drop-shadow(0 12px 22px rgba(0,0,0,.34))}
    .mobile-hero-company-logo .mh-wordmark{width:min(245px,72vw);height:auto;filter:drop-shadow(0 8px 16px rgba(0,0,0,.24))}
    .hero{padding-top:23px!important}
    .hero .kicker{text-align:center;margin-top:4px}
    .hero h1{text-align:left}
    .hero .actions{display:grid!important;grid-template-columns:1fr!important;gap:9px!important}
    .mobile-join-team{display:inline-flex!important;width:100%!important;min-height:46px!important}

    /* Mobile portal navigation belongs at the top, directly under the portal header. */
    .portal-page .mobile-app-tabbar{display:grid!important;position:fixed!important;top:64px!important;bottom:auto!important;left:0!important;right:0!important;height:58px!important;padding:5px 8px!important;border-radius:0 0 17px 17px!important;border-left:0!important;border-right:0!important;background:rgba(8,19,33,.98)!important;box-shadow:0 12px 30px rgba(0,0,0,.28)!important;z-index:405!important}
    .portal-page .mobile-app-tab{border-radius:13px!important;padding:3px 1px!important}
    .portal-page .mobile-app-tab .tab-icon{font-size:16px!important}.portal-page .mobile-app-tab .tab-label{font-size:8.5px!important}
    .portal-page .portal-main{padding-top:76px!important;padding-bottom:max(26px,env(safe-area-inset-bottom))!important}

    .career-sizzle-placeholder{padding:46px 0}.career-sizzle-card{grid-template-columns:1fr;gap:16px;padding:20px;border-radius:20px}.career-sizzle-card h2{font-size:31px}.career-sizzle-frame{border-radius:17px}.career-sizzle-play{width:58px;height:58px}
    .career-path-grid{grid-template-columns:1fr;gap:8px}.career-path-option{min-height:70px;padding:12px}
    #careerModal .form-grid{grid-template-columns:1fr!important}
  }
  `;
  document.head.appendChild(s);
}

function addMobileHeroBrand(){
  const heroCopy=document.querySelector('.shell .hero>div:first-child');
  if(!heroCopy||heroCopy.querySelector('.mobile-hero-company-logo'))return;
  const brand=document.createElement('div');
  brand.className='mobile-hero-company-logo';
  brand.innerHTML=`<img class="mh-shield" src="assets/brand-9aa0ec99b3b0.webp" alt="Allshield shield"><img class="mh-wordmark" src="assets/brand-6553d9469f9e.webp" alt="Allshield Insurance Group">`;
  heroCopy.insertBefore(brand,heroCopy.firstChild);
}

function removeTrustBlock(){
  document.querySelector('.shell .hero .trust-row')?.remove();
}

function addMobileJoinTeam(){
  const actions=document.querySelector('.shell .hero .actions');
  if(!actions||actions.querySelector('.mobile-join-team'))return;
  const b=document.createElement('button');
  b.type='button';b.className='btn btn-ghost mobile-join-team';b.textContent='Join Our Team';
  b.onclick=()=>{if(typeof window.openCareersPage==='function')window.openCareersPage();};
  actions.appendChild(b);
}

function addSizzlePlaceholder(){
  const careers=document.getElementById('careersPage');
  if(!careers||careers.querySelector('.career-sizzle-placeholder'))return;
  const final=careers.querySelector('.career-final-screen');
  const section=document.createElement('section');
  section.className='career-sizzle-placeholder';
  section.innerHTML=`<div class="wrap career-sizzle-card"><div><span class="career-eyebrow">THE ALLSHIELD OPPORTUNITY</span><h2>See the opportunity in 3 minutes.</h2><p>Before someone joins the team, this is where the Allshield opportunity sizzle will live — a short, high-energy overview of the model, support, technology, income opportunity and path forward. The video itself will be produced after the site experience is locked.</p></div><div class="career-sizzle-frame"><div><div class="career-sizzle-play">▶</div><strong>3-Minute Opportunity Sizzle</strong><span>Reserved video position • production coming next</span></div></div></div>`;
  if(final)final.parentNode.insertBefore(section,final);else careers.querySelector('.career-canvas')?.appendChild(section);
}

function careerModal(){return document.getElementById('careerModal')}
function setCareerPath(path){
  const modal=careerModal();if(!modal)return;
  modal.dataset.path=path;
  modal.querySelectorAll('.career-path-option').forEach(b=>b.classList.toggle('active',b.dataset.path===path));
  modal.querySelectorAll('.career-conditional').forEach(el=>el.classList.remove('show'));
  modal.querySelector(`[data-career-section="${path}"]`)?.classList.add('show');
  const hidden=modal.querySelector('#careerLicensingStatus');if(hidden)hidden.value=path==='licensed'?'Already licensed':path==='studying'?'Currently studying':'Not licensed yet';
}

function buildCareerApplication(){
  const modal=careerModal();if(!modal||modal.dataset.recruitingV9==='1')return;
  modal.dataset.recruitingV9='1';
  const card=modal.querySelector('.modal-card');if(!card)return;
  card.innerHTML=`
    <button class="close" type="button" onclick="closeCareer()">×</button>
    <div class="kicker">JOIN ALLSHIELD</div>
    <h3>Start your Allshield journey.</h3>
    <p style="color:#9eb1c5;line-height:1.55;margin-bottom:12px">Licensed already or starting from zero — tell us where you are today. We’ll route your application to the right next step.</p>
    <div class="career-path-grid">
      <button type="button" class="career-path-option active" data-path="licensed"><strong>I’m Already Licensed</strong><span>I hold an active insurance license and want to learn about producing with Allshield.</span></button>
      <button type="button" class="career-path-option" data-path="unlicensed"><strong>I’m Not Licensed Yet</strong><span>I want to explore the opportunity and understand the path to becoming licensed.</span></button>
    </div>
    <input type="hidden" id="careerLicensingStatus" value="Already licensed">
    <div class="form-grid">
      <div><label>Full Name *</label><input id="careerFullName" class="field" autocomplete="name" placeholder="Full name"></div>
      <div><label>Email *</label><input id="careerEmail" class="field" type="email" autocomplete="email" placeholder="Email address"></div>
      <div><label>Phone *</label><input id="careerPhone" class="field" type="tel" autocomplete="tel" placeholder="Phone number"></div>
      <div><label>Resident State *</label><input id="careerState" class="field" maxlength="2" placeholder="TX"></div>
    </div>
    <div class="career-conditional show" data-career-section="licensed">
      <div class="form-grid">
        <div><label>States You’re Licensed In</label><input id="careerLicensedStates" class="field" placeholder="Example: TX, FL, GA"></div>
        <div><label>License Number</label><input id="careerLicenseNumber" class="field" placeholder="Optional"></div>
      </div>
    </div>
    <div class="career-conditional" data-career-section="unlicensed">
      <div class="form-grid">
        <div><label>Are You Currently Studying?</label><select id="careerStudying" class="field"><option value="No">No</option><option value="Yes">Yes</option></select></div>
        <div><label>When Would You Like to Start?</label><select id="careerTimeline" class="field"><option>Immediately</option><option>Within 30 days</option><option>Within 60 days</option><option>Just exploring</option></select></div>
      </div>
    </div>
    <label>Sales / Insurance / Customer Experience</label><textarea id="careerExperience" class="field" style="min-height:88px;resize:vertical" placeholder="Tell us briefly about your background. No insurance experience is required."></textarea>
    <label>Why are you interested in Allshield?</label><textarea id="careerWhy" class="field" style="min-height:88px;resize:vertical" placeholder="What are you looking to build or change in your career?"></textarea>
    <label class="career-consent"><input id="careerConsent" type="checkbox"><span>I agree that Allshield may contact me about this career opportunity and next steps.</span></label>
    <input id="careerWebsite" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
    <div id="careerFormStatus" class="career-form-status"></div>
    <button id="careerSubmitButton" class="btn btn-primary" type="button" style="width:100%">Submit My Application</button>
    <p style="font-size:10px;color:#6f8499;line-height:1.45;margin:11px 0 0">Submitting an application does not guarantee appointment, contracting, employment or earnings. Licensing and carrier requirements apply.</p>`;
  modal.querySelectorAll('.career-path-option').forEach(b=>b.addEventListener('click',()=>setCareerPath(b.dataset.path)));
  modal.querySelector('#careerSubmitButton')?.addEventListener('click',submitCareerApplication);
  setCareerPath('licensed');
}

async function postCareer(payload){
  const cfg=window.ALLSHIELD_CONFIG||{};
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY)throw new Error('Career application service is not connected.');
  const res=await fetch(`${cfg.SUPABASE_URL}/functions/v1/public-intake`,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify(payload)});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data.error)throw new Error(data.error||'Unable to submit your application.');
  return data;
}

async function submitCareerApplication(){
  const modal=careerModal();if(!modal)return;
  const status=modal.querySelector('#careerFormStatus');const btn=modal.querySelector('#careerSubmitButton');
  const full_name=modal.querySelector('#careerFullName')?.value.trim()||'';
  const email=modal.querySelector('#careerEmail')?.value.trim()||'';
  const phone=modal.querySelector('#careerPhone')?.value.trim()||'';
  const resident_state=(modal.querySelector('#careerState')?.value.trim()||'').toUpperCase();
  const path=modal.dataset.path||'licensed';
  const licensing_status=path==='licensed'?'Already licensed':modal.querySelector('#careerStudying')?.value==='Yes'?'Currently studying':'Not licensed yet';
  if(full_name.length<2)return status.textContent='Please enter your full name.';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return status.textContent='Please enter a valid email address.';
  if(phone.length<7)return status.textContent='Please enter your phone number.';
  if(!/^[A-Z]{2}$/.test(resident_state))return status.textContent='Please enter your 2-letter resident state.';
  if(!modal.querySelector('#careerConsent')?.checked)return status.textContent='Please confirm that Allshield may contact you about the opportunity.';
  const details=[
    path==='licensed'?`Licensed states: ${modal.querySelector('#careerLicensedStates')?.value.trim()||'Not provided'}`:`Currently studying: ${modal.querySelector('#careerStudying')?.value||'No'}`,
    path==='licensed'?`License number: ${modal.querySelector('#careerLicenseNumber')?.value.trim()||'Not provided'}`:`Desired timeline: ${modal.querySelector('#careerTimeline')?.value||'Not provided'}`,
    `Experience: ${modal.querySelector('#careerExperience')?.value.trim()||'Not provided'}`,
    `Why Allshield: ${modal.querySelector('#careerWhy')?.value.trim()||'Not provided'}`
  ].join('\n');
  btn.disabled=true;btn.textContent='Submitting…';status.style.color='#9eb1c5';status.textContent='Sending your application securely…';
  try{
    await postCareer({action:'career',full_name,email,phone,resident_state,licensing_status,notes:details,website:modal.querySelector('#careerWebsite')?.value||''});
    status.style.color='#79d7a7';status.textContent='Application received. An Allshield team member can follow up with your next step.';
    btn.textContent='Application Received';
  }catch(e){status.style.color='#ff9696';status.textContent=e.message||'Unable to submit your application.';btn.disabled=false;btn.textContent='Submit My Application';}
}

function overrideCareerFlow(){
  window.openCareer=function(){buildCareerApplication();careerModal()?.classList.add('show')};
  window.closeCareer=function(){careerModal()?.classList.remove('show')};
  window.submitCareer=submitCareerApplication;
}

function init(){
  injectStyles();
  addMobileHeroBrand();
  removeTrustBlock();
  addMobileJoinTeam();
  addSizzlePlaceholder();
  buildCareerApplication();
  overrideCareerFlow();
  window.ALLSHIELD_PRODUCTION_POLISH_VERSION=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
