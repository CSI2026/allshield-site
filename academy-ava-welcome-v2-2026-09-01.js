(()=>{
'use strict';
const VERSION='2026.09.01.001';
const WELCOME='https://xxeiddnfbdqxwuojuggy.supabase.co/storage/v1/object/public/academy-media/instructors/ava/welcome-guided-v2.mp4';
function apply(){const v=document.getElementById('asAvaWelcomeVideo');if(!v||v.dataset.asPremiumWelcomeV2==='1')return;const wasPlaying=!v.paused&&!v.ended;v.dataset.asPremiumWelcomeV2='1';v.src=WELCOME;v.load();if(wasPlaying)setTimeout(()=>v.play().catch(()=>{}),80)}
function boot(){apply();const t=setInterval(apply,250);window.__asAvaWelcomeV2Poll=t}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ALLSHIELD_AVA_WELCOME_V2_VERSION=VERSION;
})();