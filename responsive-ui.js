(()=>{
'use strict';
const BREAKPOINT=1100;
function closePortal(portal){if(!portal)return;portal.classList.remove('mobile-nav-open');portal.querySelector('.mobile-portal-menu')?.setAttribute('aria-expanded','false');if(!document.querySelector('.portal-page.mobile-nav-open'))document.body.classList.remove('portal-nav-lock');}
function openPortal(portal){if(!portal)return;document.querySelectorAll('.portal-page.mobile-nav-open').forEach(p=>{if(p!==portal)closePortal(p)});portal.classList.add('mobile-nav-open');portal.querySelector('.mobile-portal-menu')?.setAttribute('aria-expanded','true');document.body.classList.add('portal-nav-lock');}
function enhance(portal){
 if(!portal||portal.dataset.responsiveReady==='1')return;
 const top=portal.querySelector('.portal-top'),sidebar=portal.querySelector('.sidebar');if(!top||!sidebar)return;
 portal.dataset.responsiveReady='1';
 const btn=document.createElement('button');btn.type='button';btn.className='mobile-portal-menu';btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Open portal navigation');btn.innerHTML='<span aria-hidden="true">☰</span><span>Menu</span>';
 const exit=top.querySelector(':scope > .btn');if(exit)top.insertBefore(btn,exit);else top.appendChild(btn);
 const shade=document.createElement('div');shade.className='portal-nav-backdrop';shade.setAttribute('aria-hidden','true');portal.appendChild(shade);
 btn.addEventListener('click',()=>portal.classList.contains('mobile-nav-open')?closePortal(portal):openPortal(portal));
 shade.addEventListener('click',()=>closePortal(portal));
 sidebar.addEventListener('click',e=>{if(window.innerWidth<=BREAKPOINT&&e.target.closest('.side-link'))setTimeout(()=>closePortal(portal),40);});
}
function init(){document.querySelectorAll('.portal-page').forEach(enhance);}
function closeAll(){document.querySelectorAll('.portal-page.mobile-nav-open').forEach(closePortal);}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();});
window.addEventListener('resize',()=>{if(window.innerWidth>BREAKPOINT)closeAll();},{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
new MutationObserver(init).observe(document.documentElement,{childList:true,subtree:true});
window.allshieldCloseMobilePortalNav=closeAll;
})();
