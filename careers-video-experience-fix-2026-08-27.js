(()=>{
'use strict';
const VERSION='2026.08.27.007';

function injectStyles(){
  if(document.getElementById('allshieldCareersVideoExperience007')) return;
  const s=document.createElement('style');
  s.id='allshieldCareersVideoExperience007';
  s.textContent=`
    .shell .hero .mobile-join-team{display:none!important}
    #careersPage .career-sizzle-placeholder.career-sizzle-top{
      order:-100;
      padding:34px 0 44px!important;
      background:radial-gradient(circle at 78% 12%,rgba(64,163,236,.16),transparent 28%),linear-gradient(180deg,#040a12,#071321)!important;
      border-top:0!important;border-bottom:1px solid rgba(255,255,255,.08)
    }
    #careersPage .career-sizzle-top .career-sizzle-card{display:grid;grid-template-columns:1.05fr .95fr;gap:30px;align-items:center;padding:26px!important;border:1px solid rgba(255,255,255,.11);border-radius:24px!important;background:linear-gradient(145deg,rgba(12,39,68,.95),rgba(5,15,27,.98))!important;box-shadow:0 30px 85px rgba(0,0,0,.34)!important}
    #careersPage .career-sizzle-top .career-sizzle-card h2{font-family:Georgia,'Times New Roman',serif;font-size:clamp(34px,4.4vw,58px)!important;line-height:1.02!important;margin:9px 0 14px!important;letter-spacing:-.03em}
    #careersPage .career-sizzle-top .career-sizzle-card p{font-size:15px!important;line-height:1.7!important;color:#a9bdd0!important;max-width:650px!important}
    #careersPage .career-sizzle-top .career-sizzle-frame{aspect-ratio:16/9;border-radius:20px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 50% 40%,rgba(78,169,235,.18),transparent 35%),#06101d;display:grid;place-items:center;text-align:center;padding:22px;min-height:300px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.025),0 18px 50px rgba(0,0,0,.24)}
    #careerSizzlePlayer [data-asz-voice]{display:none!important}
    #careerSizzlePlayer .asz-subline{max-width:820px!important}
    @media(max-width:820px){
      #careersPage .career-sizzle-placeholder.career-sizzle-top{padding:16px 0 26px!important}
      #careersPage .career-sizzle-top .career-sizzle-card{grid-template-columns:1fr;padding:16px!important;gap:14px!important}
      #careersPage .career-sizzle-top .career-sizzle-card h2{font-size:32px!important}
      #careersPage .career-sizzle-top .career-sizzle-frame{min-height:235px!important}
    }
  `;
  document.head.appendChild(s);
}

function removeHomeRecruitingCTA(){
  document.querySelectorAll('.shell .hero .mobile-join-team').forEach(el=>el.remove());
  document.querySelectorAll('.shell .hero .actions button,.shell .hero .actions a').forEach(el=>{
    const t=(el.textContent||'').trim().toLowerCase();
    if(t==='join our team'||t==='join the team') el.remove();
  });
}

function ensureSizzleExists(){
  const careers=document.getElementById('careersPage');
  const canvas=careers?.querySelector('.career-canvas');
  if(!careers||!canvas) return null;
  let sizzle=careers.querySelector('.career-sizzle-placeholder');
  if(sizzle) return sizzle;
  sizzle=document.createElement('section');
  sizzle.className='career-sizzle-placeholder';
  sizzle.innerHTML=`<div class="wrap career-sizzle-card"><div><span class="career-eyebrow">START HERE • THE ALLSHIELD OPPORTUNITY</span><h2>See why ALLSHIELD is being built differently — in 3 minutes.</h2><p>Before you read the rest of the Careers page, watch the opportunity first. This section is linked directly to the ALLSHIELD Video Studio project and is reserved for the finished studio-produced recruiting video.</p></div><div class="career-sizzle-frame"><div><div class="career-sizzle-play">▶</div><strong>Why Join Our Team</strong><span>Professional video experience</span></div></div></div>`;
  canvas.insertBefore(sizzle,canvas.firstElementChild);
  return sizzle;
}

function moveSizzleToTop(){
  const careers=document.getElementById('careersPage');
  const canvas=careers?.querySelector('.career-canvas');
  const sizzle=ensureSizzleExists();
  if(!canvas||!sizzle) return;
  sizzle.classList.add('career-sizzle-top');
  if(canvas.firstElementChild!==sizzle) canvas.insertBefore(sizzle,canvas.firstElementChild);
  const card=sizzle.querySelector('.career-sizzle-card');
  const left=card?.firstElementChild;
  if(left){
    const eyebrow=left.querySelector('.career-eyebrow');const h=left.querySelector('h2');const p=left.querySelector('p');
    if(eyebrow) eyebrow.textContent='START HERE • THE ALLSHIELD OPPORTUNITY';
    if(h) h.textContent='See why ALLSHIELD is being built differently — in 3 minutes.';
    if(p) p.textContent='Before you read the rest of the Careers page, watch the opportunity first. This section is linked directly to the ALLSHIELD Video Studio project and is reserved for the finished studio-produced recruiting video.';
  }
}

function removeRobotNarrationLabels(){
  const btn=document.querySelector('#careersPage .career-sizzle-final-button');
  if(btn){btn.querySelectorAll('span').forEach(el=>{const t=(el.textContent||'').trim();if(/Narrated/i.test(t)) el.textContent=t.replace(/\s*•?\s*Narrated\s*•?/i,' • Cinematic visual preview • ');});}
  document.querySelector('#careerSizzlePlayer [data-asz-voice]')?.remove();
  try{if(window.speechSynthesis)window.speechSynthesis.cancel();}catch{}
}

function clean(){injectStyles();removeHomeRecruitingCTA();ensureSizzleExists();moveSizzleToTop();removeRobotNarrationLabels();window.ALLSHIELD_CAREERS_VIDEO_EXPERIENCE_VERSION=VERSION;}
function install(){clean();const obs=new MutationObserver(()=>clean());obs.observe(document.documentElement,{subtree:true,childList:true});setInterval(()=>{if(document.visibilityState==='visible')clean();},2500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();