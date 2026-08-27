(()=>{
'use strict';
const VERSION='2026.08.27.006';

function addStyles(){
  if(document.getElementById('allshieldCareerScroll006'))return;
  const s=document.createElement('style');
  s.id='allshieldCareerScroll006';
  s.textContent=`
  #careerModal.modal.show{display:flex!important;align-items:center!important;justify-content:center!important;padding:20px!important;overflow:hidden!important;background:rgba(0,0,0,.68)!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);touch-action:pan-y!important}
  #careerModal .modal-card{position:relative!important;width:min(720px,100%)!important;max-width:720px!important;max-height:calc(100dvh - 40px)!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;touch-action:pan-y!important;scroll-behavior:auto!important;scrollbar-gutter:stable!important;padding-top:14px!important}
  #careerModal .modal-card>.close{position:sticky!important;top:0!important;z-index:90!important;float:none!important;display:grid!important;place-items:center!important;width:42px!important;height:42px!important;margin:0 0 8px auto!important;padding:0!important;border-radius:13px!important;border:1px solid rgba(255,255,255,.13)!important;background:#102238!important;color:#fff!important;font-size:25px!important;line-height:1!important;box-shadow:0 8px 18px rgba(0,0,0,.24)!important;touch-action:manipulation!important}
  #careerModal .modal-card>.close:active{transform:scale(.96)}
  #careerModal input,#careerModal select,#careerModal textarea{font-size:16px!important}
  #careerModal .career-form-status{padding-bottom:10px}
  @media(max-width:820px){
    #careerModal.modal.show{align-items:flex-end!important;justify-content:center!important;padding:0!important;overflow:hidden!important}
    #careerModal .modal-card{width:100%!important;max-width:none!important;height:min(92dvh,92vh)!important;max-height:min(92dvh,92vh)!important;margin:0!important;border-radius:26px 26px 0 0!important;padding:14px 15px calc(28px + env(safe-area-inset-bottom))!important;border-left:0!important;border-right:0!important;border-bottom:0!important;overflow-y:scroll!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;touch-action:pan-y!important;box-shadow:0 -30px 70px rgba(0,0,0,.52)!important}
    #careerModal .modal-card:before{content:'';display:block;width:38px;height:4px;border-radius:999px;background:rgba(255,255,255,.18);margin:0 auto 8px}
    #careerModal .form-grid{grid-template-columns:1fr!important}
    #careerModal .career-path-grid{grid-template-columns:1fr!important}
  }
  `;
  document.head.appendChild(s);
}

function cleanHomepageUrl(){
  try{
    if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
    const u=new URL(location.href);
    const removable=['v','cert','mobilecert','utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'];
    let changed=false;
    for(const k of removable){if(u.searchParams.has(k)){u.searchParams.delete(k);changed=true}}
    if(!changed)return;
    const protectedKeys=['code','state','error','error_description','provider','access_token','refresh_token'];
    if(protectedKeys.some(k=>u.searchParams.has(k)))return;
    const search=u.searchParams.toString();
    const cleanPath='/' + (search?`?${search}`:'') + (u.hash||'');
    history.replaceState(history.state||{},'',cleanPath);
  }catch{}
}

function keepCareerSheetReady(){
  const modal=document.getElementById('careerModal');
  if(!modal)return;
  const card=modal.querySelector('.modal-card');
  if(card&&modal.classList.contains('show')&&!modal.dataset.scrollReady){
    modal.dataset.scrollReady='1';
    card.scrollTop=0;
  }
  if(!modal.classList.contains('show'))delete modal.dataset.scrollReady;
}

function wrapCareerControls(){
  if(window.__allshieldCareerScroll006)return;
  window.__allshieldCareerScroll006=true;
  const originalOpen=window.openCareer;
  const originalClose=window.closeCareer;
  window.openCareer=function(...args){
    const out=typeof originalOpen==='function'?originalOpen.apply(this,args):undefined;
    const modal=document.getElementById('careerModal');
    modal?.classList.add('show');
    const card=modal?.querySelector('.modal-card');
    if(card){requestAnimationFrame(()=>{card.scrollTop=0;card.focus?.({preventScroll:true})})}
    return out;
  };
  window.closeCareer=function(...args){
    const out=typeof originalClose==='function'?originalClose.apply(this,args):undefined;
    document.getElementById('careerModal')?.classList.remove('show');
    return out;
  };
}

function addCanonical(){
  let c=document.querySelector('link[rel="canonical"]');
  if(!c){c=document.createElement('link');c.rel='canonical';document.head.appendChild(c)}
  c.href='https://allshieldinsurancegroup.com/';
}

function init(){
  addStyles();
  addCanonical();
  cleanHomepageUrl();
  wrapCareerControls();
  keepCareerSheetReady();
  new MutationObserver(()=>{wrapCareerControls();keepCareerSheetReady()}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.ALLSHIELD_MOBILE_CAREER_DOMAIN_FIX_VERSION=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();