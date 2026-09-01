(()=>{
'use strict';
const VERSION='2026.08.31.016';

function loadAcademyBootstrap(){
  if(document.getElementById('allshieldCommercialAcademyLoader'))return;
  const s=document.createElement('script');
  s.id='allshieldCommercialAcademyLoader';
  s.src='./academy-commercial-loader-2026-08-31.js?v=2026.08.31.007';
  s.async=false;
  (document.body||document.documentElement).appendChild(s);
}
if(document.body)loadAcademyBootstrap();
else document.addEventListener('DOMContentLoaded',loadAcademyBootstrap,{once:true});

if(window.ALLSHIELD_RUNTIME_MUTATION_GUARD_VERSION===VERSION)return;
const Native=window.MutationObserver;
if(typeof Native!=='function'){
  window.ALLSHIELD_RUNTIME_MUTATION_GUARD_VERSION=VERSION;
  window.ALLSHIELD_BLOCKED_GLOBAL_OBSERVERS=0;
  return;
}
let blocked=0;
class AllshieldMutationObserver{
  constructor(callback){this._native=new Native(callback)}
  observe(target,options={}){
    const wholeDocument=(target===document||target===document.documentElement||target===document.body)&&options&&options.subtree===true;
    if(wholeDocument){blocked+=1;window.ALLSHIELD_BLOCKED_GLOBAL_OBSERVERS=blocked;return;}
    return this._native.observe(target,options);
  }
  disconnect(){return this._native.disconnect()}
  takeRecords(){return this._native.takeRecords()}
}
window.MutationObserver=AllshieldMutationObserver;
if(window.WebKitMutationObserver===Native)window.WebKitMutationObserver=AllshieldMutationObserver;
window.ALLSHIELD_RUNTIME_MUTATION_GUARD_VERSION=VERSION;
window.ALLSHIELD_BLOCKED_GLOBAL_OBSERVERS=blocked;
})();