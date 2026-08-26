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
function enhanceLogin(role){
 const login=document.getElementById(role+'Login');
 if(!login||login.dataset.mobileLoginReady==='1')return;
 const user=login.querySelector('input:not([type]),input[type="text"],input[type="email"]');
 const pass=login.querySelector('input[type="password"]');
 const button=login.querySelector('button.btn-primary');
 if(!user||!pass||!button)return;
 login.dataset.mobileLoginReady='1';
 user.type='text';user.autocomplete='username';user.setAttribute('autocapitalize','none');user.setAttribute('autocorrect','off');user.spellcheck=false;user.inputMode='email';
 pass.autocomplete='current-password';
 button.removeAttribute('onclick');
 const submit=async()=>{
   if(button.dataset.busy==='1')return;
   if(typeof window.productionLogin!=='function'){alert('Secure login is still loading. Please try again in a moment.');return;}
   button.dataset.busy='1';
   const original=button.textContent;
   button.disabled=true;button.textContent='Signing in…';
   try{await window.productionLogin(role);}finally{button.dataset.busy='0';button.disabled=false;button.textContent=original;}
 };
 button.addEventListener('click',e=>{e.preventDefault();submit();});
 [user,pass].forEach(input=>input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit();}}));
}
function init(){document.querySelectorAll('.portal-page').forEach(enhance);['agent','admin','owner'].forEach(enhanceLogin);}
function closeAll(){document.querySelectorAll('.portal-page.mobile-nav-open').forEach(closePortal);}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();});
window.addEventListener('resize',()=>{if(window.innerWidth>BREAKPOINT)closeAll();},{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
new MutationObserver(init).observe(document.documentElement,{childList:true,subtree:true});
window.allshieldCloseMobilePortalNav=closeAll;
})();
