(()=>{
'use strict';
const VERSION='2026.08.27.010';
const VIDEO_URL='https://allshieldinsurancegroup.com/assets/video/allshield-careers-built-around-the-customer.mp4';

function injectStyles(){
  if(document.getElementById('allshieldProfessionalCareersVideo008'))return;
  const s=document.createElement('style');
  s.id='allshieldProfessionalCareersVideo008';
  s.textContent=`
    #careersPage .career-sizzle-frame:has(video){padding:0!important;background:#000!important;border-color:rgba(112,195,251,.22)!important;overflow:hidden!important;box-shadow:0 24px 60px rgba(0,0,0,.34)!important}
    #careersPage .career-sizzle-frame video{display:block!important;width:100%!important;height:100%!important;aspect-ratio:16/9!important;object-fit:contain!important;background:#000!important;border-radius:inherit!important}
    #careersPage .career-sizzle-top .career-sizzle-card{align-items:center!important}
    #careersPage .career-live-badge{display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:7px 11px;border-radius:999px;background:rgba(55,170,111,.10);border:1px solid rgba(86,218,151,.22);color:#9fe3bf;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    #careersPage .career-live-badge:before{content:'';width:7px;height:7px;border-radius:50%;background:#66dda0;box-shadow:0 0 12px rgba(102,221,160,.65)}
    @media(max-width:820px){#careersPage .career-sizzle-frame:has(video){min-height:0!important;aspect-ratio:16/9!important}#careersPage .career-sizzle-frame video{min-height:0!important}}
  `;
  document.head.appendChild(s);
}

function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function removeHomeRecruitingCTA(){
  document.querySelectorAll('.shell .hero .mobile-join-team').forEach(el=>el.remove());
  document.querySelectorAll('.shell .hero .actions button,.shell .hero .actions a').forEach(el=>{
    if(/^(join our team|join the team)$/i.test((el.textContent||'').trim()))el.remove();
  });
}
function polishCareers(){
  const careers=document.getElementById('careersPage');
  const sizzle=careers?.querySelector('.career-sizzle-placeholder');
  const canvas=careers?.querySelector('.career-canvas');
  if(!sizzle||!canvas)return false;
  if(!sizzle.classList.contains('career-sizzle-top'))sizzle.classList.add('career-sizzle-top');
  if(canvas.firstElementChild!==sizzle)canvas.insertBefore(sizzle,canvas.firstElementChild);
  const copy=sizzle.querySelector('.career-sizzle-card>div:first-child');
  if(copy){
    setText(copy.querySelector('.career-eyebrow'),'WATCH FIRST • THE ALLSHIELD OPPORTUNITY');
    setText(copy.querySelector('h2'),'See why ALLSHIELD is built differently.');
    setText(copy.querySelector('p'),'Before you explore the rest of the Careers page, watch how ALLSHIELD is building a customer-first system for licensed agents and people preparing to become licensed.');
    if(!copy.querySelector('.career-live-badge')){
      const badge=document.createElement('div');badge.className='career-live-badge';badge.textContent='Professional opportunity video';copy.appendChild(badge);
    }
  }
  const video=sizzle.querySelector('video');
  if(video){
    if(video.getAttribute('src')!==VIDEO_URL)video.src=VIDEO_URL;
    video.controls=true;video.playsInline=true;video.preload='metadata';
    video.setAttribute('aria-label','ALLSHIELD Careers — Built Around the Customer');
  }
  return !!video;
}
function polishOwnerStudio(){
  const studio=document.getElementById('ytStudio');if(!studio)return;
  const cards=[...studio.querySelectorAll('.career-route-card')];cards.slice(1).forEach(card=>card.remove());
  const card=cards[0];if(!card)return;
  setText(card.querySelector('.route-title'),'WEBSITE DESTINATION • PROFESSIONAL VIDEO LIVE');
  setText(card.querySelector('h3'),'Careers Page → Professional Opportunity Video');
  setText(card.querySelector('.route-provider-note'),'The approved HeyGen master is published on the ALLSHIELD domain and is live at the top of the Careers page. Browser text-to-speech is disabled.');
  setText(card.querySelector('#openCareerSizzlePreview'),'Watch Live Careers Video');
}
function scan(){injectStyles();removeHomeRecruitingCTA();const ready=polishCareers();polishOwnerStudio();window.ALLSHIELD_CAREERS_PRO_VIDEO_VERSION=VERSION;return ready}
function install(){
  scan();
  [300,800,1500,3000,6000].forEach(ms=>setTimeout(scan,ms));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(scan,0)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
