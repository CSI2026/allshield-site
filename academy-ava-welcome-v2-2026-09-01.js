(()=>{
'use strict';
const VERSION='2026.09.01.003';
const WELCOME='https://xxeiddnfbdqxwuojuggy.supabase.co/storage/v1/object/public/academy-media/instructors/ava/welcome-canonical-v3.mp4';
function styles(){if(document.getElementById('asCanonicalAvaWelcomeStyles'))return;const s=document.createElement('style');s.id='asCanonicalAvaWelcomeStyles';s.textContent='#asAvaWelcomeVideo:not([data-as-canonical-welcome-v3="1"]){visibility:hidden!important}';document.head.appendChild(s)}
function apply(){const v=document.getElementById('asAvaWelcomeVideo');if(!v||v.dataset.asCanonicalWelcomeV3==='1')return;const wasPlaying=!v.paused&&!v.ended;try{v.pause()}catch{}v.dataset.asCanonicalWelcomeV3='1';v.src=WELCOME;v.load();v.style.visibility='visible';if(wasPlaying)setTimeout(()=>v.play().catch(()=>{}),40)}
function boot(){styles();apply();let fast=0;const t=setInterval(()=>{apply();if(++fast>120){clearInterval(t);window.__asAvaWelcomeV2Poll=setInterval(apply,250)}},25);window.__asAvaWelcomeV2Poll=t}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ALLSHIELD_AVA_WELCOME_V2_VERSION=VERSION;
})();