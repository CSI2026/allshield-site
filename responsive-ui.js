(()=>{
'use strict';

const MOBILE_BREAKPOINT=820;
const VERSION='2026.08.26.006';

const roleConfig={
  agent:{
    label:'Agent Portal',
    tabs:[
      {route:'dashboard',label:'Home',icon:'⌂'},
      {route:'ai',label:'AI',icon:'✦'},
      {route:'study',label:'Academy',icon:'▣'},
      {route:'production',label:'Work',icon:'↗'},
      {route:'more',label:'More',icon:'☰'}
    ],
    groups:[
      ['Today',['dashboard','ai','communications','meetings']],
      ['Learn & License',['onboarding','licensing','study','tests']],
      ['Performance & Growth',['production','performance','achievements','careerpath']],
      ['Account & Tools',['documents','resources','profile']]
    ]
  },
  admin:{
    label:'Admin Portal',
    tabs:[
      {route:'dashboard',label:'Home',icon:'⌂'},
      {route:'team',label:'Team',icon:'♟'},
      {route:'ai',label:'AI',icon:'✦'},
      {route:'production',label:'Work',icon:'↗'},
      {route:'more',label:'More',icon:'☰'}
    ],
    groups:[
      ['Command',['dashboard','ai','communications','meetings']],
      ['People',['team','hierarchy','onboarding']],
      ['Academy & Compliance',['courses','licensing','tests','documents']],
      ['Operations',['production','leaderboard','automations','marketing','settings']]
    ]
  },
  owner:{
    label:'Owner Portal',
    tabs:[
      {route:'dashboard',label:'Home',icon:'⌂'},
      {route:'ai',label:'AI',icon:'✦'},
      {route:'teamaccounts',label:'Team',icon:'♟'},
      {route:'performance',label:'Results',icon:'↗'},
      {route:'more',label:'More',icon:'☰'}
    ],
    groups:[
      ['Command',['dashboard','ai','performance','communications']],
      ['People & Access',['permissions','teamaccounts','departments','hierarchy']],
      ['Academy & Licensing',['states','academy','testing','versions']],
      ['Growth & Content',['marketing','social','video','media','brand']],
      ['Governance',['meetings','updates','files','audit','buildhistory','settings']]
    ]
  }
};

function injectStyles(){
  if(document.getElementById('allshieldMobileAppCss'))return;
  const link=document.createElement('link');
  link.id='allshieldMobileAppCss';
  link.rel='stylesheet';
  link.href=`./mobile-app.css?v=${VERSION}`;
  document.head.appendChild(link);
}

function esc(v){
  return String(v??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function roleFromPortal(portal){
  if(!portal)return null;
  if(portal.id==='agentPortal')return 'agent';
  if(portal.id==='adminPortal')return 'admin';
  if(portal.id==='ownerPortal')return 'owner';
  return null;
}

function routeFromLink(link){
  const code=link?.getAttribute('onclick')||'';
  const m=code.match(/show(?:Agent|Admin|Owner)View\('([^']+)'/);
  return m?.[1]||'';
}

function linkParts(link){
  const raw=String(link?.textContent||'').replace(/\s+/g,' ').trim();
  const bits=raw.split(' ');
  const icon=bits.length>1?bits.shift():'•';
  const label=bits.join(' ')||raw||'Open';
  return {icon,label};
}

function routeMap(portal){
  const map=new Map();
  portal?.querySelectorAll('.sidebar .side-link').forEach(link=>{
    const route=routeFromLink(link);
    if(route)map.set(route,link);
  });
  return map;
}

function showRoute(portal,role,route){
  if(!portal||!role||!route)return;
  const map=routeMap(portal);
  const link=map.get(route)||null;
  const fn=window[role==='agent'?'showAgentView':role==='admin'?'showAdminView':'showOwnerView'];
  if(typeof fn!=='function')return;
  fn(route,link);
  syncPortal(portal,route);
  closeMenu(portal);
  window.scrollTo({top:0,behavior:'auto'});
}

function currentRoute(portal){
  const active=portal?.querySelector('.sidebar .side-link.active');
  return routeFromLink(active)||portal?.querySelector('.portal-main')?.dataset?.currentView||'dashboard';
}

function syncPortal(portal,forcedRoute){
  const role=roleFromPortal(portal);
  const route=forcedRoute||currentRoute(portal);
  const map=routeMap(portal);
  const source=map.get(route);
  const {label}=linkParts(source);
  const title=portal?.querySelector('.mobile-current-title');
  if(title)title.textContent=label||'Dashboard';

  portal?.querySelectorAll('.mobile-app-tab').forEach(btn=>{
    const tabRoute=btn.dataset.route;
    btn.classList.toggle('active',tabRoute===route || (tabRoute==='more' && !roleConfig[role]?.tabs.some(t=>t.route===route)));
  });
  portal?.querySelectorAll('.mobile-tool-button').forEach(btn=>btn.classList.toggle('active',btn.dataset.route===route));
}

function closeMenu(portal){
  portal?.querySelector('.mobile-app-menu')?.classList.remove('open');
  document.body.classList.remove('mobile-app-menu-lock');
}

function openMenu(portal){
  if(!portal)return;
  document.querySelectorAll('.mobile-app-menu.open').forEach(menu=>{
    if(!portal.contains(menu))menu.classList.remove('open');
  });
  portal.querySelector('.mobile-app-menu')?.classList.add('open');
  document.body.classList.add('mobile-app-menu-lock');
  const search=portal.querySelector('.mobile-app-menu-search input');
  if(search){search.value='';filterMenu(portal,'');setTimeout(()=>search.focus({preventScroll:true}),140);}
}

function filterMenu(portal,value){
  const q=String(value||'').trim().toLowerCase();
  portal?.querySelectorAll('.mobile-tool-group').forEach(group=>{
    let visible=0;
    group.querySelectorAll('.mobile-tool-button').forEach(btn=>{
      const hay=(btn.dataset.search||btn.textContent||'').toLowerCase();
      const show=!q||hay.includes(q);
      btn.style.display=show?'flex':'none';
      if(show)visible++;
    });
    group.style.display=visible?'block':'none';
  });
}

function buildMenu(portal,role){
  const cfg=roleConfig[role];
  const map=routeMap(portal);
  const menu=document.createElement('section');
  menu.className='mobile-app-menu';
  menu.setAttribute('aria-label','All tools');
  menu.innerHTML=`
    <div class="mobile-app-menu-panel">
      <div class="mobile-app-menu-head">
        <img src="assets/brand-9aa0ec99b3b0.webp" alt="Allshield">
        <div class="menu-title"><small>${esc(cfg.label)}</small><strong>All Tools</strong></div>
        <button type="button" class="mobile-menu-close" aria-label="Close tools">×</button>
      </div>
      <div class="mobile-app-menu-search"><input type="search" placeholder="Search tools and sections" autocomplete="off" aria-label="Search tools"></div>
      <div class="mobile-app-menu-scroll"></div>
      <div class="mobile-menu-footer">
        <button type="button" data-menu-dashboard>⌂ Dashboard</button>
        <button type="button" class="exit" data-menu-exit>Exit Portal</button>
      </div>
    </div>`;

  const scroll=menu.querySelector('.mobile-app-menu-scroll');
  const used=new Set();

  function addGroup(name,routes){
    const available=routes.filter(r=>map.has(r));
    if(!available.length)return;
    const group=document.createElement('section');
    group.className='mobile-tool-group';
    group.innerHTML=`<div class="mobile-tool-group-title">${esc(name)}</div><div class="mobile-tool-grid"></div>`;
    const grid=group.querySelector('.mobile-tool-grid');
    available.forEach(route=>{
      used.add(route);
      const link=map.get(route);
      const {icon,label}=linkParts(link);
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='mobile-tool-button';
      btn.dataset.route=route;
      btn.dataset.search=`${label} ${route} ${name}`;
      btn.innerHTML=`<span class="mobile-tool-icon">${esc(icon)}</span><span class="mobile-tool-copy"><strong>${esc(label)}</strong><small>Open section</small></span>`;
      btn.addEventListener('click',()=>showRoute(portal,role,route));
      grid.appendChild(btn);
    });
    scroll.appendChild(group);
  }

  cfg.groups.forEach(([name,routes])=>addGroup(name,routes));
  const remaining=[...map.keys()].filter(route=>!used.has(route));
  if(remaining.length)addGroup('More',remaining);

  menu.querySelector('.mobile-menu-close').addEventListener('click',()=>closeMenu(portal));
  menu.addEventListener('click',e=>{if(e.target===menu)closeMenu(portal);});
  menu.querySelector('.mobile-app-menu-search input').addEventListener('input',e=>filterMenu(portal,e.target.value));
  menu.querySelector('[data-menu-dashboard]').addEventListener('click',()=>showRoute(portal,role,'dashboard'));
  menu.querySelector('[data-menu-exit]').addEventListener('click',()=>{
    closeMenu(portal);
    if(typeof window.allshieldSignOut==='function')window.allshieldSignOut();
    else if(typeof window.returnHome==='function')window.returnHome();
  });
  portal.appendChild(menu);
}

function buildTabbar(portal,role){
  const cfg=roleConfig[role];
  const bar=document.createElement('nav');
  bar.className='mobile-app-tabbar';
  bar.setAttribute('aria-label',`${cfg.label} primary navigation`);
  cfg.tabs.forEach(tab=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='mobile-app-tab';
    btn.dataset.route=tab.route;
    btn.innerHTML=`<span class="tab-icon">${esc(tab.icon)}</span><span class="tab-label">${esc(tab.label)}</span>`;
    btn.addEventListener('click',()=>tab.route==='more'?openMenu(portal):showRoute(portal,role,tab.route));
    bar.appendChild(btn);
  });
  portal.appendChild(bar);
}

function buildTitle(portal,role){
  const left=portal.querySelector('.portal-top .left');
  if(!left||left.querySelector('.mobile-title-stack'))return;
  const stack=document.createElement('div');
  stack.className='mobile-title-stack';
  stack.innerHTML=`<small>${esc(roleConfig[role].label)}</small><strong class="mobile-current-title">Dashboard</strong>`;
  left.appendChild(stack);
}

function enhancePortal(portal){
  if(!portal||portal.dataset.mobileAppReady==='1')return;
  const role=roleFromPortal(portal);
  if(!role||!portal.querySelector('.sidebar')||!portal.querySelector('.portal-top'))return;
  portal.dataset.mobileAppReady='1';
  buildTitle(portal,role);
  buildTabbar(portal,role);
  buildMenu(portal,role);

  portal.querySelector('.sidebar').addEventListener('click',e=>{
    const link=e.target.closest('.side-link');
    if(link)setTimeout(()=>syncPortal(portal,routeFromLink(link)),0);
  });

  const sidebar=portal.querySelector('.sidebar');
  new MutationObserver(()=>syncPortal(portal)).observe(sidebar,{subtree:true,attributes:true,attributeFilter:['class']});
  syncPortal(portal);
}

function enhanceLogin(role){
  const login=document.getElementById(role+'Login');
  if(!login||login.dataset.mobileLoginReady==='1')return;
  const user=login.querySelector('input:not([type]),input[type="text"],input[type="email"]');
  const pass=login.querySelector('input[type="password"]');
  const button=login.querySelector('button.btn-primary');
  if(!user||!pass||!button)return;
  login.dataset.mobileLoginReady='1';
  user.type='text';
  user.autocomplete='username';
  user.setAttribute('autocapitalize','none');
  user.setAttribute('autocorrect','off');
  user.spellcheck=false;
  user.inputMode='email';
  pass.autocomplete='current-password';
  button.removeAttribute('onclick');
  const submit=async()=>{
    if(button.dataset.busy==='1')return;
    if(typeof window.productionLogin!=='function'){alert('Secure login is still loading. Please try again in a moment.');return;}
    button.dataset.busy='1';
    const original=button.textContent;
    button.disabled=true;
    button.textContent='Signing in…';
    try{await window.productionLogin(role);}finally{button.dataset.busy='0';button.disabled=false;button.textContent=original;}
  };
  button.addEventListener('click',e=>{e.preventDefault();submit();});
  [user,pass].forEach(input=>input.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit();}
  }));
}

function buildPublicDock(){
  const shell=document.querySelector('.shell');
  if(!shell||shell.querySelector('.public-app-dock'))return;
  const dock=document.createElement('nav');
  dock.className='public-app-dock';
  dock.setAttribute('aria-label','Allshield mobile navigation');
  dock.innerHTML=`
    <button type="button" data-public-action="home"><span class="app-icon">⌂</span><span class="app-label">Home</span></button>
    <button type="button" data-public-action="coverage"><span class="app-icon">◇</span><span class="app-label">Coverage</span></button>
    <button type="button" data-public-action="careers"><span class="app-icon">◆</span><span class="app-label">Careers</span></button>
    <button type="button" class="public-primary" data-public-action="protect"><span class="app-icon">＋</span><span class="app-label">Protect</span></button>
    <button type="button" data-public-action="portal"><span class="app-icon">◎</span><span class="app-label">Portal</span></button>`;
  dock.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-public-action]');
    if(!btn)return;
    const action=btn.dataset.publicAction;
    dock.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));
    if(action==='home')document.getElementById('top')?.scrollIntoView({behavior:'smooth'});
    if(action==='coverage')document.getElementById('coverage')?.scrollIntoView({behavior:'smooth'});
    if(action==='careers'&&typeof window.openCareersPage==='function')window.openCareersPage();
    if(action==='protect'&&typeof window.openLead==='function')window.openLead();
    if(action==='portal'&&typeof window.openPortalChooser==='function')window.openPortalChooser();
  });
  shell.appendChild(dock);
}

function closeAllMenus(){
  document.querySelectorAll('.portal-page').forEach(closeMenu);
}

function init(){
  injectStyles();
  document.querySelectorAll('.portal-page').forEach(enhancePortal);
  ['agent','admin','owner'].forEach(enhanceLogin);
  buildPublicDock();
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAllMenus();});
window.addEventListener('resize',()=>{if(window.innerWidth>MOBILE_BREAKPOINT)closeAllMenus();},{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
new MutationObserver(init).observe(document.documentElement,{childList:true,subtree:true});
window.allshieldCloseMobilePortalNav=closeAllMenus;
window.ALLSHIELD_MOBILE_APP_VERSION=VERSION;
})();
