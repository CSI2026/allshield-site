(()=>{
'use strict';
const VERSION='2026.08.27.005';
const CFG=()=>window.ALLSHIELD_CONFIG||{};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let publicCfg=null, publicCfgPromise=null;

async function publicConfig(force=false){
  if(publicCfg&&!force)return publicCfg;
  if(publicCfgPromise)return publicCfgPromise;
  publicCfgPromise=(async()=>{
    const c=CFG();
    if(!c.SUPABASE_URL)throw new Error('Supabase URL missing');
    const r=await fetch(`${c.SUPABASE_URL}/functions/v1/career-sizzle-config?ts=${Date.now()}`,{
      headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY||''},cache:'no-store'
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error)throw new Error(d.error||`Sizzle config HTTP ${r.status}`);
    publicCfg=d;return d;
  })();
  try{return await publicCfgPromise}finally{publicCfgPromise=null}
}

function injectStyles(){
  if(document.getElementById('allshieldCareerSizzleStyles'))return;
  const s=document.createElement('style');
  s.id='allshieldCareerSizzleStyles';
  s.textContent=`
#ytStudio .career-route-card{margin:14px 0 18px;padding:16px 18px;border:1px solid rgba(111,189,245,.28);border-radius:16px;background:linear-gradient(135deg,rgba(15,50,82,.84),rgba(8,25,42,.94));display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center}
#ytStudio .career-route-card .route-title{font-size:10px;letter-spacing:.16em;font-weight:900;color:#7bcaff;text-transform:uppercase;margin-bottom:7px}
#ytStudio .career-route-card h3{font-family:Georgia,'Times New Roman',serif;margin:0 0 6px;font-size:22px;color:#fff}.career-route-meta{color:#9fb3c7;font-size:12px;line-height:1.55}.career-route-meta strong{color:#fff}
#ytStudio .route-provider-note{margin-top:9px;padding:9px 11px;border-radius:11px;background:rgba(43,160,103,.10);font-size:11px;color:#9fe0bd;line-height:1.45}
#ytStudio .career-route-actions .tiny-btn{min-width:155px}
@media(max-width:720px){#ytStudio .career-route-card{grid-template-columns:1fr}.career-route-actions{display:grid;grid-template-columns:1fr}.career-route-actions .tiny-btn{width:100%}}
.career-sizzle-frame.route-ready{border-color:rgba(104,194,255,.38)!important;background:linear-gradient(145deg,#07111e,#09213a)!important;overflow:hidden;position:relative}.career-sizzle-route-status{margin-top:10px;font-size:10px;color:#86a2b8;line-height:1.55}.career-sizzle-route-status strong{color:#e7f3fc}
.career-sizzle-final-button{appearance:none;border:0;background:radial-gradient(circle at 50% 35%,rgba(55,157,229,.17),transparent 40%),linear-gradient(145deg,#061321,#081b30);color:inherit;width:100%;height:100%;min-height:310px;padding:28px;cursor:pointer;text-align:center;font:inherit;border-radius:17px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.career-sizzle-final-button:before{content:'';position:absolute;inset:-40%;background:conic-gradient(from 210deg,transparent,rgba(103,196,255,.10),transparent 28%);animation:allshieldSizzleSpin 11s linear infinite}@keyframes allshieldSizzleSpin{to{transform:rotate(360deg)}}
.career-sizzle-final-button:focus-visible{outline:2px solid #68c2ff;outline-offset:-5px}.career-sizzle-final-button:hover .career-sizzle-play{transform:scale(1.07);box-shadow:0 14px 40px rgba(50,156,225,.34)}.career-sizzle-play{transition:.18s ease;width:72px!important;height:72px!important;box-shadow:0 12px 34px rgba(50,156,225,.24)}
.career-sizzle-ready-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid rgba(116,208,255,.24);background:rgba(43,139,205,.11);color:#86d2ff;font-size:9px;letter-spacing:.12em;font-weight:900;text-transform:uppercase;margin-bottom:12px}.career-sizzle-ready-badge:before{content:'';width:7px;height:7px;border-radius:50%;background:#78d8aa;box-shadow:0 0 12px #78d8aa}
#careerSizzlePlayer{position:fixed;inset:0;z-index:1000000;background:#020812;display:none;align-items:center;justify-content:center;color:#fff;font-family:Arial,Helvetica,sans-serif}#careerSizzlePlayer.open{display:flex}
#careerSizzlePlayer .asz-shell{position:relative;width:100vw;height:100vh;overflow:hidden;background:#030b15}
#careerSizzlePlayer .asz-stage{position:absolute;inset:0;overflow:hidden;background:radial-gradient(circle at 74% 18%,rgba(42,143,214,.16),transparent 32%),linear-gradient(135deg,#03101d,#071a2d 58%,#04101d);transition:background 1s ease}
#careerSizzlePlayer .asz-noise{position:absolute;inset:0;opacity:.055;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E")}
#careerSizzlePlayer .asz-glow{position:absolute;width:60vw;height:60vw;right:-18vw;top:-18vw;border-radius:50%;background:radial-gradient(circle,rgba(65,171,238,.22),transparent 64%);filter:blur(14px);animation:aszFloat 9s ease-in-out infinite alternate}@keyframes aszFloat{to{transform:translate(-8vw,7vh) scale(1.12)}}
#careerSizzlePlayer .asz-grid{position:absolute;inset:0;opacity:.11;background-image:linear-gradient(rgba(116,191,242,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(116,191,242,.12) 1px,transparent 1px);background-size:70px 70px;mask-image:linear-gradient(to bottom,transparent,black 18%,black 72%,transparent)}
#careerSizzlePlayer .asz-topbar{position:absolute;z-index:30;left:0;right:0;top:0;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;background:linear-gradient(180deg,rgba(2,8,18,.88),rgba(2,8,18,0))}
#careerSizzlePlayer .asz-brand{display:flex;align-items:center;gap:12px}.asz-brand img{width:48px;height:48px;object-fit:contain;filter:drop-shadow(0 6px 16px rgba(0,0,0,.5))}.asz-brand-copy strong{display:block;font-size:12px;letter-spacing:.13em}.asz-brand-copy span{font-size:9px;color:#77c8ff;letter-spacing:.16em;text-transform:uppercase}
#careerSizzlePlayer .asz-top-actions{display:flex;align-items:center;gap:8px}.asz-icon-btn{appearance:none;border:1px solid rgba(255,255,255,.15);background:rgba(5,19,32,.72);color:#eaf6ff;border-radius:11px;min-width:42px;height:42px;padding:0 11px;display:inline-grid;place-items:center;cursor:pointer;font-size:12px;backdrop-filter:blur(8px)}.asz-icon-btn:hover{border-color:rgba(113,202,255,.45);background:rgba(15,52,80,.8)}
#careerSizzlePlayer .asz-center{position:absolute;z-index:10;inset:0;display:flex;align-items:center;justify-content:center;padding:10vh 7vw 18vh}.asz-scene{width:min(1180px,100%);display:grid;grid-template-columns:minmax(0,1.08fr) minmax(320px,.92fr);gap:5vw;align-items:center}.asz-copy{opacity:0;transform:translateY(20px);animation:aszReveal .72s cubic-bezier(.2,.8,.2,1) forwards}@keyframes aszReveal{to{opacity:1;transform:none}}
.asz-eyebrow{font-size:10px;letter-spacing:.24em;color:#72c9ff;font-weight:900;text-transform:uppercase;margin-bottom:16px}.asz-headline{font-family:Georgia,'Times New Roman',serif;font-size:clamp(42px,6.4vw,90px);line-height:.96;letter-spacing:-.045em;margin:0;color:white;text-wrap:balance}.asz-headline .accent{color:#78caff}.asz-subline{margin-top:22px;max-width:760px;color:#b8cad9;font-size:clamp(15px,1.4vw,20px);line-height:1.58}.asz-scene-label{margin-top:22px;color:#6f879b;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.asz-visual{position:relative;min-height:390px;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.96);animation:aszVisual .82s .12s cubic-bezier(.2,.8,.2,1) forwards}@keyframes aszVisual{to{opacity:1;transform:none}}.asz-visual-card{width:min(440px,90%);padding:24px;border-radius:24px;background:linear-gradient(145deg,rgba(14,43,69,.92),rgba(5,19,33,.94));border:1px solid rgba(115,203,255,.22);box-shadow:0 28px 70px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.04)}
.asz-card-kicker{font-size:9px;color:#74caff;letter-spacing:.16em;text-transform:uppercase;font-weight:900}.asz-card-title{font-family:Georgia,'Times New Roman',serif;font-size:31px;margin:9px 0 18px}.asz-chip-row{display:flex;gap:8px;flex-wrap:wrap}.asz-chip{padding:8px 11px;border-radius:999px;background:#102943;border:1px solid rgba(255,255,255,.08);color:#aac0d2;font-size:11px}.asz-chip.bad{background:rgba(119,45,45,.18);border-color:rgba(235,105,105,.18);color:#dfa6a6}.asz-chip.good{background:rgba(42,137,94,.16);border-color:rgba(94,210,146,.2);color:#a7e3c1}.asz-divider{height:1px;background:rgba(255,255,255,.08);margin:18px 0}.asz-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0}.asz-row span{color:#9db0c2;font-size:12px}.asz-row strong{font-size:12px}.asz-live{display:inline-flex;align-items:center;gap:7px;color:#a9e4c1}.asz-live:before{content:'';width:8px;height:8px;border-radius:50%;background:#56d899;box-shadow:0 0 14px rgba(86,216,153,.7);animation:aszPulse 1.25s ease-in-out infinite}@keyframes aszPulse{50%{transform:scale(.6);opacity:.55}}
.asz-phone{position:relative;width:220px;height:220px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(62,171,238,.25),rgba(20,72,111,.16) 55%,transparent 56%);animation:aszPhone 2s ease-in-out infinite}@keyframes aszPhone{50%{transform:scale(1.04)}}.asz-phone:before,.asz-phone:after{content:'';position:absolute;border:1px solid rgba(113,206,255,.28);border-radius:50%;inset:18px}.asz-phone:after{inset:-10px;opacity:.4}.asz-phone-icon{font-size:72px;transform:rotate(-18deg);filter:drop-shadow(0 8px 22px rgba(0,0,0,.35))}
.asz-funnel{display:grid;gap:10px;width:100%}.asz-funnel-step{padding:12px 14px;border:1px solid rgba(113,202,255,.16);background:rgba(14,47,76,.65);border-radius:13px;display:flex;align-items:center;gap:11px;color:#b8c8d6;font-size:12px}.asz-funnel-step b{width:28px;height:28px;border-radius:9px;background:#123a5d;color:#7bcaff;display:grid;place-items:center}.asz-funnel-step:last-child{border-color:rgba(83,207,142,.24);background:rgba(32,105,72,.17);color:#b6e7cb}
.asz-metric{font-family:Georgia,'Times New Roman',serif;font-size:72px;line-height:1;color:#fff}.asz-metric small{font:700 12px Arial;color:#7ccaff;display:block;letter-spacing:.1em;text-transform:uppercase;margin-top:9px}.asz-checks{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:18px}.asz-check{height:36px;border-radius:9px;background:rgba(52,156,102,.16);border:1px solid rgba(83,207,142,.18);display:grid;place-items:center;color:#7ae0a9;font-weight:900;animation:aszCheck .35s both}.asz-check:nth-child(2){animation-delay:.08s}.asz-check:nth-child(3){animation-delay:.16s}.asz-check:nth-child(4){animation-delay:.24s}.asz-check:nth-child(5){animation-delay:.32s}.asz-check:nth-child(6){animation-delay:.4s}.asz-check:nth-child(7){animation-delay:.48s}.asz-check:nth-child(8){animation-delay:.56s}.asz-check:nth-child(9){animation-delay:.64s}.asz-check:nth-child(10){animation-delay:.72s}@keyframes aszCheck{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:none}}
.asz-pipeline{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.asz-system{padding:14px;border-radius:13px;background:rgba(12,38,62,.7);border:1px solid rgba(255,255,255,.07);font-size:11px;color:#9fb5c8}.asz-system strong{display:block;color:#e9f5fc;font-size:12px;margin-bottom:4px}.asz-system b{color:#79caff;font-size:17px;margin-right:6px}.asz-big-words{display:grid;gap:10px}.asz-big-word{font-family:Georgia,'Times New Roman',serif;font-size:clamp(28px,4vw,52px);padding:12px 15px;border-left:3px solid #57b8f2;background:linear-gradient(90deg,rgba(47,133,190,.14),transparent);animation:aszWord .5s both}.asz-big-word:nth-child(2){animation-delay:.2s}.asz-big-word:nth-child(3){animation-delay:.4s}@keyframes aszWord{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
.asz-disclaimer{font-size:12px;line-height:1.6;color:#a6b7c6;padding:18px;border-radius:14px;border:1px solid rgba(255,190,96,.17);background:rgba(110,74,24,.12)}.asz-disclaimer strong{color:#f3d5a0}.asz-cta-logo{width:160px;max-width:48%;filter:drop-shadow(0 20px 30px rgba(0,0,0,.4));margin-bottom:18px}.asz-cta-btn{appearance:none;border:0;border-radius:999px;background:linear-gradient(135deg,#77c8ff,#237fc7 52%,#155e9b);color:white;font-weight:900;padding:14px 23px;cursor:pointer;box-shadow:0 14px 35px rgba(27,124,200,.28);margin-top:18px}
#careerSizzlePlayer .asz-caption{position:absolute;z-index:24;left:50%;bottom:102px;transform:translateX(-50%);width:min(900px,88vw);text-align:center;font-size:clamp(13px,1.3vw,18px);line-height:1.45;color:#fff;text-shadow:0 2px 8px #000;padding:10px 16px;border-radius:12px;background:rgba(1,7,14,.54);backdrop-filter:blur(7px);opacity:1;transition:.2s}.asz-caption.off{opacity:0;pointer-events:none}
#careerSizzlePlayer .asz-bottom{position:absolute;z-index:28;left:0;right:0;bottom:0;padding:15px 22px 18px;background:linear-gradient(0deg,rgba(2,8,18,.96),rgba(2,8,18,.20),transparent)}.asz-timeline{height:6px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden;cursor:pointer}.asz-progress{height:100%;width:0;background:linear-gradient(90deg,#3da7e9,#7ad2ff);box-shadow:0 0 15px rgba(80,187,248,.44)}.asz-bottom-row{display:flex;align-items:center;justify-content:space-between;gap:13px;margin-top:12px}.asz-controls{display:flex;align-items:center;gap:7px}.asz-btn{appearance:none;border:1px solid rgba(255,255,255,.13);background:rgba(9,31,51,.76);color:#fff;border-radius:10px;height:39px;min-width:39px;padding:0 11px;cursor:pointer}.asz-btn.primary{background:#2087ca;border-color:#4db5f2;font-weight:800}.asz-btn:hover{background:#123b5d}.asz-time{font-size:11px;color:#94aabd;white-space:nowrap}.asz-scene-dots{display:flex;gap:4px;align-items:center}.asz-dot{width:5px;height:5px;border-radius:99px;background:#36536b}.asz-dot.on{width:15px;background:#6ec8ff}.asz-dot.done{background:#3b91c9}
@media(max-width:820px){#careerSizzlePlayer .asz-center{padding:11vh 6vw 20vh}.asz-scene{grid-template-columns:1fr;gap:20px}.asz-visual{min-height:220px}.asz-visual-card{width:min(540px,94%)}.asz-headline{font-size:clamp(38px,11vw,62px)}.asz-subline{font-size:14px;margin-top:14px}.asz-caption{bottom:118px!important}.asz-topbar{padding:12px!important}.asz-brand-copy{display:none}.asz-top-actions .asz-icon-btn span{display:none}.asz-top-actions .asz-icon-btn{min-width:40px;padding:0 8px}.asz-scene-dots{display:none}.asz-bottom{padding:12px 12px 16px!important}.asz-bottom-row{align-items:flex-start}.asz-time{font-size:10px}.asz-phone{width:150px;height:150px}.asz-phone-icon{font-size:52px}}
@media(max-width:520px){.asz-visual{min-height:180px}.asz-visual-card{padding:16px}.asz-card-title{font-size:22px}.asz-center{padding-top:10vh!important}.asz-caption{bottom:130px!important;font-size:12px!important}.asz-btn[data-asz-prev],.asz-btn[data-asz-next]{display:none}.asz-top-actions .asz-icon-btn{font-size:11px}}
`;
  document.head.appendChild(s);
}

function bestVoice(){
  if(!('speechSynthesis' in window))return null;
  const voices=window.speechSynthesis.getVoices().filter(v=>/^en([-_]|$)/i.test(v.lang||'en'));
  const prefs=[['Aaron',100],['Evan',96],['Nathan',94],['Daniel',92],['Alex',90],['Samantha',88],['Ava',86],['Allison',84],['Google US English',82],['Microsoft Guy',80],['Microsoft Aria',78],['English United States',70]];
  let best=null,score=-1;
  for(const v of voices){let s=0;for(const [n,w] of prefs)if(String(v.name).toLowerCase().includes(String(n).toLowerCase()))s=Math.max(s,w);if(v.localService)s+=3;if(/en-US/i.test(v.lang))s+=4;if(s>score){score=s;best=v}}
  return best||voices[0]||null;
}

function createMusic(){
  let ctx=null,nodes=[],timer=null,enabled=true;
  const chords=[[130.81,196,261.63],[155.56,233.08,311.13],[174.61,261.63,349.23],[116.54,174.61,233.08]];
  function start(){if(!enabled||ctx)return;try{ctx=new (window.AudioContext||window.webkitAudioContext)();const master=ctx.createGain();master.gain.value=.035;master.connect(ctx.destination);nodes.push(master);let ci=0;const setChord=()=>{const chord=chords[ci++%chords.length];nodes.filter(n=>n.__osc).forEach(n=>{try{n.stop()}catch{}});nodes=nodes.filter(n=>!n.__osc);chord.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),lp=ctx.createBiquadFilter();o.type=i===0?'sine':'triangle';o.frequency.value=f/(i===0?2:1);g.gain.value=i===0?.34:.17;lp.type='lowpass';lp.frequency.value=620;o.connect(lp);lp.connect(g);g.connect(master);o.start();o.__osc=true;nodes.push(o,g,lp)});};setChord();timer=setInterval(setChord,12000)}catch{}}
  function stop(){if(timer)clearInterval(timer);timer=null;nodes.forEach(n=>{try{if(n.stop)n.stop()}catch{}try{if(n.disconnect)n.disconnect()}catch{}});nodes=[];if(ctx){try{ctx.close()}catch{}ctx=null}}
  function toggle(){enabled=!enabled;if(enabled)start();else stop();return enabled}
  return {start,stop,toggle,get enabled(){return enabled}};
}

function visualMarkup(i,s){
  const title=esc(s.title||'');
  const visual=[
    `<div class="asz-visual-card"><div class="asz-card-kicker">THE OLD WAY</div><div class="asz-card-title">Chasing attention</div><div class="asz-chip-row"><span class="asz-chip bad">Cold calls</span><span class="asz-chip bad">Unread DMs</span><span class="asz-chip bad">Friends & family</span><span class="asz-chip bad">Stale lists</span></div><div class="asz-divider"></div><div class="asz-row"><span>Agent time spent prospecting</span><strong>Too much</strong></div><div class="asz-row"><span>Customer intent</span><strong>Unknown</strong></div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">PROSPECTING PRESSURE</div><div class="asz-card-title">Your personal network is not the business model.</div><div class="asz-chip-row"><span class="asz-chip bad">Post more</span><span class="asz-chip bad">Message everyone</span><span class="asz-chip bad">Call family</span></div><div class="asz-divider"></div><div class="asz-row"><span>What agents should be doing</span><strong>Serving customers</strong></div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">TIME COST</div><div class="asz-card-title">Hours lost before the real conversation.</div><div class="asz-row"><span>Lead list</span><strong>Opened</strong></div><div class="asz-row"><span>Voicemail</span><strong>Again</strong></div><div class="asz-row"><span>Follow-up</span><strong>Again</strong></div><div class="asz-row"><span>Customer conversation</span><strong>Still waiting</strong></div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">ALLSHIELD MODEL</div><div class="asz-card-title">We move acquisition upstream.</div><div class="asz-funnel"><div class="asz-funnel-step"><b>1</b>Marketing creates consumer interest</div><div class="asz-funnel-step"><b>2</b>Verification confirms the opportunity</div><div class="asz-funnel-step"><b>3</b>Live transfer reaches the agent</div><div class="asz-funnel-step"><b>✓</b>Agent serves the customer</div></div></div>`,
    `<div class="asz-phone"><div class="asz-phone-icon">☎</div></div><div class="asz-visual-card" style="position:absolute;bottom:20px;width:330px"><div class="asz-row"><span>Incoming</span><strong class="asz-live">LIVE TRANSFER</strong></div><div class="asz-row"><span>Customer status</span><strong>Ready to speak</strong></div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">THE CONVERSATION</div><div class="asz-card-title">The customer is already on the phone.</div><div class="asz-row"><span>Customer</span><strong class="asz-live">Connected</strong></div><div class="asz-row"><span>Agent</span><strong>Ready</strong></div><div class="asz-row"><span>Purpose</span><strong>Coverage guidance</strong></div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">PROFESSIONAL AGENT WORK</div><div class="asz-big-words"><div class="asz-big-word">Listen.</div><div class="asz-big-word">Understand.</div><div class="asz-big-word">Help.</div></div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">LICENSED AGENT</div><div class="asz-card-title">Plug into the system.</div><div class="asz-row"><span>License</span><strong class="asz-live">Active</strong></div><div class="asz-row"><span>Live transfer queue</span><strong>Available</strong></div><div class="asz-row"><span>Personal-network prospecting</span><strong>Not required</strong></div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">NOT LICENSED YET</div><div class="asz-card-title">There is a path.</div><div class="asz-funnel"><div class="asz-funnel-step"><b>1</b>Training & Academy</div><div class="asz-funnel-step"><b>2</b>Licensing preparation</div><div class="asz-funnel-step"><b>3</b>Technology & support</div><div class="asz-funnel-step"><b>✓</b>Prepared for the customer call</div></div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">VOLUME MODEL</div><div class="asz-metric">10–15<small>reported completed customers / 5–6 hours*</small></div><div class="asz-checks">${Array.from({length:10},()=>'<div class="asz-check">✓</div>').join('')}</div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">COMPLIANCE MATTERS</div><div class="asz-card-title">No guaranteed outcomes.</div><div class="asz-disclaimer"><strong>Results vary.</strong><br>Production depends on licensing, availability, performance, compliance, customer eligibility and other factors. The example shown is not an income or production guarantee.</div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">THE SYSTEM AROUND THE AGENT</div><div class="asz-pipeline"><div class="asz-system"><b>01</b><strong>Training</strong>Academy & development</div><div class="asz-system"><b>02</b><strong>Compliance</strong>Customer-first standards</div><div class="asz-system"><b>03</b><strong>Performance</strong>Visibility & coaching</div><div class="asz-system"><b>04</b><strong>AI Tools</strong>Modern support systems</div><div class="asz-system"><b>05</b><strong>Leadership</strong>Growth path</div><div class="asz-system"><b>06</b><strong>Production</strong>Live customer workflow</div></div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">NO RECRUITING REQUIREMENT</div><div class="asz-card-title">Earn by serving customers.</div><div class="asz-chip-row"><span class="asz-chip bad">✕ Friends & family recruiting</span><span class="asz-chip bad">✕ Personal-page pitching</span></div><div class="asz-divider"></div><div class="asz-row"><span>Your focus</span><strong class="asz-live">Customer in front of you</strong></div></div>`,
    `<div class="asz-visual-card"><div class="asz-card-kicker">WHAT WE ASK</div><div class="asz-big-words"><div class="asz-big-word">Learn.</div><div class="asz-big-word">Work.</div><div class="asz-big-word">Serve.</div></div></div>`,
    `<div class="asz-visual-card" style="text-align:center"><img src="assets/brand-9aa0ec99b3b0.webp" class="asz-cta-logo" alt="Allshield"><div class="asz-card-kicker">ALLSHIELD INSURANCE GROUP</div><div class="asz-card-title">Where will you fit inside what we're building?</div><button type="button" class="asz-cta-btn" data-asz-apply>Apply to Join Our Team</button></div>`
  ];
  return visual[i]||`<div class="asz-visual-card"><div class="asz-card-kicker">ALLSHIELD</div><div class="asz-card-title">${title}</div></div>`;
}

function sceneHeadline(i,s){
  const map=[
    `What if the customer <span class="accent">called you first?</span>`,
    `Stop building your business around <span class="accent">people you already know.</span>`,
    `Your day should not disappear into <span class="accent">lead chasing.</span>`,
    `ALLSHIELD is built around a <span class="accent">different model.</span>`,
    `When the opportunity is ready, <span class="accent">the call comes to you.</span>`,
    `The customer is already <span class="accent">on the phone.</span>`,
    `Do the work that <span class="accent">actually matters.</span>`,
    `Already licensed? <span class="accent">Plug in.</span>`,
    `Not licensed yet? <span class="accent">There is a path.</span>`,
    `A model designed for <span class="accent">volume.</span>`,
    `No hype. <span class="accent">No guarantees.</span>`,
    `This is bigger than <span class="accent">a dialer.</span>`,
    `You do not have to recruit your friends <span class="accent">to earn.</span>`,
    `Come ready to <span class="accent">learn, work and serve.</span>`,
    `If this sounds different, <span class="accent">take the next step.</span>`
  ];
  return map[i]||esc(s.on_screen_text||s.title||'');
}

function sceneKicker(i){
  return ['THE QUESTION','THE OLD MODEL','THE COST','THE ALLSHIELD MODEL','LIVE TRANSFER','CUSTOMER READY','THE WORK','LICENSED PATH','UNLICENSED PATH','THE OPPORTUNITY','COMPLIANCE','THE INFRASTRUCTURE','THE DIFFERENCE','THE STANDARD','THE NEXT STEP'][i]||'ALLSHIELD';
}

function buildPlayer(){
  let modal=document.getElementById('careerSizzlePlayer');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='careerSizzlePlayer';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Why Join Our Team — Allshield Opportunity');
  modal.innerHTML=`<div class="asz-shell">
    <div class="asz-stage"><div class="asz-noise"></div><div class="asz-glow"></div><div class="asz-grid"></div></div>
    <div class="asz-topbar"><div class="asz-brand"><img src="assets/brand-9aa0ec99b3b0.webp" alt="Allshield"><div class="asz-brand-copy"><strong>ALLSHIELD INSURANCE GROUP</strong><span>Why Join Our Team</span></div></div><div class="asz-top-actions"><button class="asz-icon-btn" type="button" data-asz-voice title="Narration">🔊 <span>Voice</span></button><button class="asz-icon-btn" type="button" data-asz-music title="Music">♫ <span>Music</span></button><button class="asz-icon-btn" type="button" data-asz-captions title="Captions">CC</button><button class="asz-icon-btn" type="button" data-asz-close title="Close">✕</button></div></div>
    <div class="asz-center"><div class="asz-scene"><div class="asz-copy"><div class="asz-eyebrow"></div><h2 class="asz-headline"></h2><div class="asz-subline"></div><div class="asz-scene-label"></div></div><div class="asz-visual"></div></div></div>
    <div class="asz-caption"></div>
    <div class="asz-bottom"><div class="asz-timeline"><div class="asz-progress"></div></div><div class="asz-bottom-row"><div class="asz-controls"><button class="asz-btn" type="button" data-asz-prev>‹</button><button class="asz-btn primary" type="button" data-asz-play>Pause</button><button class="asz-btn" type="button" data-asz-next>›</button><button class="asz-btn" type="button" data-asz-replay>↺</button></div><div class="asz-scene-dots"></div><div class="asz-time">0:00 / 3:00</div></div></div>
  </div>`;
  document.body.appendChild(modal);return modal;
}

function launchInteractive(cfg){
  const scenes=(Array.isArray(cfg.preview_scenes)?cfg.preview_scenes:[]).filter(s=>s&&Number(s.duration_seconds)>0);
  if(!scenes.length)return;
  const modal=buildPlayer();
  modal.classList.add('open');document.body.style.overflow='hidden';
  const music=createMusic();
  let sceneIndex=0,sceneElapsed=0,playing=true,voiceOn=cfg.voice_enabled!==false,captionsOn=true,last=performance.now(),raf=0,closed=false,lastSpoken=-1;
  const durations=scenes.map(s=>Math.max(1,Number(s.duration_seconds||12)));
  const total=durations.reduce((a,b)=>a+b,0)||180;
  const before=i=>durations.slice(0,i).reduce((a,b)=>a+b,0);
  const fmt=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
  const q=sel=>modal.querySelector(sel);
  const copy=q('.asz-copy'),visual=q('.asz-visual'),eye=q('.asz-eyebrow'),headline=q('.asz-headline'),sub=q('.asz-subline'),label=q('.asz-scene-label'),caption=q('.asz-caption'),progress=q('.asz-progress'),time=q('.asz-time'),play=q('[data-asz-play]'),dots=q('.asz-scene-dots'),voiceBtn=q('[data-asz-voice]'),musicBtn=q('[data-asz-music]'),capBtn=q('[data-asz-captions]');
  dots.innerHTML=scenes.map((_,i)=>`<span class="asz-dot" data-dot="${i}"></span>`).join('');

  function speak(force=false){
    if(!voiceOn||!playing||!('speechSynthesis' in window))return;
    if(lastSpoken===sceneIndex&&!force)return;
    lastSpoken=sceneIndex;window.speechSynthesis.cancel();
    const text=String(scenes[sceneIndex].narration||'').trim();if(!text)return;
    const u=new SpeechSynthesisUtterance(text);const v=bestVoice();if(v)u.voice=v;u.lang='en-US';
    const wc=text.split(/\s+/).filter(Boolean).length,target=durations[sceneIndex];const wpm=wc/(target/60);u.rate=clamp(wpm/165,.88,1.32);u.pitch=.94;u.volume=.96;
    window.speechSynthesis.speak(u);
  }
  function renderScene(forceSpeech=false){
    const s=scenes[sceneIndex];
    copy.style.animation='none';visual.style.animation='none';void copy.offsetWidth;void visual.offsetWidth;copy.style.animation='';visual.style.animation='';
    eye.textContent=sceneKicker(sceneIndex);headline.innerHTML=sceneHeadline(sceneIndex,s);sub.textContent=s.narration||'';label.textContent=`SCENE ${sceneIndex+1} OF ${scenes.length} • ${s.title||''}`;visual.innerHTML=visualMarkup(sceneIndex,s);caption.textContent=s.narration||'';
    [...dots.children].forEach((d,i)=>{d.classList.toggle('on',i===sceneIndex);d.classList.toggle('done',i<sceneIndex)});
    q('[data-asz-apply]')?.addEventListener('click',()=>{close();setTimeout(()=>{if(typeof window.openCareer==='function')window.openCareer();else document.querySelector('[onclick*="openCareer"]')?.click();},120)});
    if(forceSpeech||lastSpoken!==sceneIndex)speak(forceSpeech);
  }
  function renderProgress(){const current=clamp(before(sceneIndex)+sceneElapsed,0,total);progress.style.width=`${current/total*100}%`;time.textContent=`${fmt(current)} / ${fmt(total)}`;play.textContent=playing?'Pause':'Play';voiceBtn.style.opacity=voiceOn?'1':'.45';musicBtn.style.opacity=music.enabled?'1':'.45';capBtn.style.opacity=captionsOn?'1':'.45';caption.classList.toggle('off',!captionsOn)}
  function setScene(i,autoplay=playing){sceneIndex=clamp(i,0,scenes.length-1);sceneElapsed=0;playing=autoplay;lastSpoken=-1;renderScene(true);renderProgress()}
  function close(){if(closed)return;closed=true;playing=false;cancelAnimationFrame(raf);try{window.speechSynthesis.cancel()}catch{}music.stop();modal.classList.remove('open');document.body.style.overflow='';document.removeEventListener('keydown',keys)}
  function togglePlay(){if(sceneIndex===scenes.length-1&&sceneElapsed>=durations[sceneIndex]-.05){sceneIndex=0;sceneElapsed=0;lastSpoken=-1;renderScene(true)}playing=!playing;if(playing){last=performance.now();try{window.speechSynthesis.resume()}catch{}speak(true);music.start()}else{try{window.speechSynthesis.pause()}catch{}}renderProgress()}
  function keys(e){if(!modal.classList.contains('open'))return;if(e.key==='Escape')close();else if(e.key===' '){e.preventDefault();togglePlay()}else if(e.key==='ArrowRight')setScene(sceneIndex+1,true);else if(e.key==='ArrowLeft')setScene(sceneIndex-1,true)}
  function step(ts){if(closed)return;const dt=Math.min(.25,(ts-last)/1000);last=ts;if(playing){sceneElapsed+=dt;if(sceneElapsed>=durations[sceneIndex]){if(sceneIndex<scenes.length-1){sceneIndex++;sceneElapsed=0;lastSpoken=-1;renderScene(true)}else{sceneElapsed=durations[sceneIndex];playing=false;try{window.speechSynthesis.cancel()}catch{}}}renderProgress()}raf=requestAnimationFrame(step)}

  q('[data-asz-close]').onclick=close;q('[data-asz-prev]').onclick=()=>setScene(sceneIndex-1,true);q('[data-asz-next]').onclick=()=>setScene(sceneIndex+1,true);q('[data-asz-replay]').onclick=()=>setScene(0,true);play.onclick=togglePlay;
  voiceBtn.onclick=()=>{voiceOn=!voiceOn;if(!voiceOn){try{window.speechSynthesis.cancel()}catch{}}else speak(true);renderProgress()};musicBtn.onclick=()=>{music.toggle();renderProgress()};capBtn.onclick=()=>{captionsOn=!captionsOn;renderProgress()};
  q('.asz-timeline').onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),t=clamp((e.clientX-r.left)/r.width*total,0,total);let acc=0,idx=0;for(;idx<durations.length;idx++){if(t<acc+durations[idx])break;acc+=durations[idx]}idx=Math.min(idx,durations.length-1);sceneIndex=idx;sceneElapsed=t-acc;lastSpoken=-1;renderScene(true);renderProgress()};
  document.addEventListener('keydown',keys);
  renderScene(true);renderProgress();
  if(cfg.music_enabled!==false)music.start();
  try{window.speechSynthesis.resume()}catch{}
  last=performance.now();raf=requestAnimationFrame(step);
}

function cleanupStudioCards(studio){const cards=[...studio.querySelectorAll('.career-route-card')];cards.slice(1).forEach(x=>x.remove());return cards[0]||null}
async function injectStudio(){
  const studio=document.getElementById('ytStudio');if(!studio)return;
  if(cleanupStudioCards(studio)||studio.dataset.routeInjecting==='1')return;
  studio.dataset.routeInjecting='1';
  try{
    const cfg=await publicConfig();if(cleanupStudioCards(studio))return;
    const scenes=Array.isArray(cfg.preview_scenes)?cfg.preview_scenes.length:0;
    const seconds=Number(cfg.target_duration_seconds||180),mins=Math.floor(seconds/60),secs=String(seconds%60).padStart(2,'0');
    const card=document.createElement('div');card.className='career-route-card';card.innerHTML=`<div><div class="route-title">WEBSITE DESTINATION • LIVE</div><h3>${esc(cfg.destination_label||'Careers Page → 3-Minute Opportunity Sizzle')}</h3><div class="career-route-meta"><strong>Linked project:</strong> ${esc(cfg.title||'Why Join Our Team')} &nbsp;•&nbsp; ${mins}:${secs} &nbsp;•&nbsp; ${esc(cfg.status||'ready')}${scenes?` &nbsp;•&nbsp; ${scenes} scenes`:''}</div><div class="route-provider-note">The Careers sizzle is live as the narrated 3-minute web experience. When a finished MP4 is attached later, this same destination automatically switches to the video file.</div></div><div class="career-route-actions"><button type="button" class="tiny-btn" id="openCareerSizzlePreview">Watch Live Sizzle</button></div>`;
    const banner=studio.querySelector('.real-data-banner');if(banner)banner.insertAdjacentElement('afterend',card);else studio.prepend(card);
    card.querySelector('#openCareerSizzlePreview')?.addEventListener('click',async()=>{if(typeof window.openCareersPage==='function')window.openCareersPage();await sleep(250);const section=document.querySelector('.career-sizzle-placeholder');section?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>section?.querySelector('.career-sizzle-final-button')?.click(),450)});
  }catch{}finally{studio.dataset.routeInjecting='0';cleanupStudioCards(studio)}
}

async function injectPublic(){
  const section=document.querySelector('.career-sizzle-placeholder');if(!section||section.dataset.routeBound===VERSION)return;
  section.dataset.routeBound=VERSION;
  let cfg;try{cfg=await publicConfig(true)}catch{return}
  const frame=section.querySelector('.career-sizzle-frame');if(!frame)return;frame.classList.add('route-ready');
  if(cfg.video_url){frame.innerHTML=`<video controls playsinline preload="metadata" style="width:100%;height:100%;border-radius:17px;background:#000" src="${esc(cfg.video_url)}"></video>`;return}
  const scenes=Array.isArray(cfg.preview_scenes)?cfg.preview_scenes.length:0;
  if(cfg.player_mode==='interactive_web_sizzle'&&scenes){
    frame.innerHTML=`<button type="button" class="career-sizzle-final-button" aria-label="Play the 3-minute Allshield opportunity"><div style="position:relative;z-index:2"><div class="career-sizzle-ready-badge">Live 3-Minute Experience</div><div class="career-sizzle-play">▶</div><strong style="display:block;margin-top:14px;font-size:18px">${esc(cfg.title||'Why Join Our Team')}</strong><span style="display:block;margin-top:5px;color:#91a9bc;font-size:12px">3-Minute Opportunity • Narrated • ${scenes} scenes</span><div class="career-sizzle-route-status"><strong>Watch the ALLSHIELD opportunity now.</strong><br>Press Play for the complete three-minute experience.</div></div></button>`;
    frame.querySelector('.career-sizzle-final-button').onclick=()=>launchInteractive(cfg);
  }else{
    frame.innerHTML=`<div style="display:grid;place-items:center;height:100%;padding:28px;text-align:center;color:#9cb0c3"><div><strong style="display:block;color:#fff;margin-bottom:8px">Why Join Our Team</strong>The opportunity experience is temporarily unavailable.</div></div>`;
  }
}

function scan(){injectStyles();injectStudio();injectPublic()}
function install(){
  if(window.ALLSHIELD_VIDEO_SIZZLE_ROUTING_VERSION===VERSION)return;
  window.ALLSHIELD_VIDEO_SIZZLE_ROUTING_VERSION=VERSION;
  injectStyles();scan();
  const o=new MutationObserver(()=>scan());o.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(()=>{if(document.visibilityState==='visible')scan()},2500);
  if('speechSynthesis' in window){window.speechSynthesis.onvoiceschanged=()=>bestVoice()}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();