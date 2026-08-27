(()=>{
'use strict';
const VERSION='2026.08.26.012';
function finishPopupReturn(){
  const q=new URLSearchParams(location.search);
  const social=q.get('social_oauth');
  const youtube=q.get('youtube_oauth');
  if(!social&&!youtube)return false;
  const payload=social
    ? {type:'allshield-social-oauth',status:social,provider:q.get('provider'),message:q.get('message')}
    : {type:'allshield-youtube-oauth',status:youtube,provider:'youtube',message:q.get('message')};
  if(window.opener&&!window.opener.closed){
    try{window.opener.postMessage(payload,location.origin);}catch{}
    setTimeout(()=>window.close(),300);
  }else{
    history.replaceState({},'',location.pathname);
  }
  return true;
}
function polishConnectionCopy(){
  const section=document.getElementById('socialConnectionsSection');
  if(!section)return;
  const head=section.querySelector('.dashboard-head>div:first-child');
  const h=head?.querySelector('h3');
  const p=head?.querySelector('p');
  if(h)h.textContent='Connect every Allshield social account when you are ready';
  if(p)p.textContent='Use the connection button beside each platform. Allshield opens the provider’s secure authorization screen; social passwords never enter Allshield, and tokens stay protected on the backend.';
  const cb=section.querySelector('#socialCallbackURLs')?.parentElement?.querySelector('p');
  if(cb)cb.textContent='Use the exact HTTPS callback shown for each provider when creating its developer app. You can configure platforms one at a time whenever you are ready.';
}
function install(){
  window.ALLSHIELD_SOCIAL_OAUTH_POPUP_VERSION=VERSION;
  if(finishPopupReturn())return;
  const obs=new MutationObserver(()=>polishConnectionCopy());
  obs.observe(document.documentElement,{childList:true,subtree:true});
  polishConnectionCopy();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();