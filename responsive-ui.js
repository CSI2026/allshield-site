(()=>{
'use strict';

const MOBILE_BREAKPOINT=820;
const TABLET_BREAKPOINT=1100;
const VERSION='2026.08.26.008';

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
  if(!document.getElementById('allshieldMobileAppCss')){
    const link=document.createElement('link');
    link.id='allshieldMobileAppCss';
    link.rel='stylesheet';
    link.href=`./mobile-app.css?v=${VERSION}`;
    document.head.appendChild(link);
  }
  if(document.getElementById('allshieldMobilePolishCss'))return;
  const style=document.createElement('style');
  style.id='allshieldMobilePolishCss';
  style.textContent=`
  @media(max-width:820px){
    body{overscroll-behavior-y:none}
    .portal-page.show{isolation:isolate}
    .portal-page .portal-top{padding-left:max(10px,env(safe-area-inset-left))!important;padding-right:max(10px,env(safe-area-inset-right))!important}
    .portal-page .portal-top .left{gap:8px!important}
    .portal-page .portal-top .left>img{height:34px!important}
    .mobile-title-stack small{font-size:7.5px!important;opacity:.88}
    .mobile-title-stack strong{font-size:14px!important;max-width:58vw!important}
    .mobile-route-back{display:none;appearance:none;border:1px solid rgba(255,255,255,.11);background:#0e2238;color:#fff;width:38px;height:38px;border-radius:12px;font-size:17px;align-items:center;justify-content:center;flex:0 0 auto;touch-action:manipulation}
    .mobile-route-back.visible{display:inline-flex}
    .portal-main.mobile-route-enter{animation:allshieldRouteIn .18s ease-out}
    @keyframes allshieldRouteIn{from{opacity:.4;transform:translateY(5px)}to{opacity:1;transform:none}}

    .portal-main{padding-left:max(11px,env(safe-area-inset-left))!important;padding-right:max(11px,env(safe-area-inset-right))!important}
    .portal-main .dashboard-head{padding:3px 2px 0!important}
    .portal-main .dashboard-head h2{font-size:24px!important}
    .portal-main .dashboard-head p{max-width:620px}
    .portal-main .bo-card+.bo-card{margin-top:10px}
    .portal-main .bo-card,.portal-main .social-card,.portal-main .video-editor,.portal-main .ai-panel{overflow:hidden}
    .portal-main .bo-card>h3:first-child,.portal-main .social-card>h3:first-child{letter-spacing:-.015em}
    .portal-main .resource,.portal-main .account-row,.portal-main .queue-item,.portal-main .task{border:1px solid rgba(255,255,255,.055)!important}
    .portal-main .resource strong,.portal-main .account-row strong{font-size:13px;line-height:1.25}
    .portal-main .resource small,.portal-main .account-row small{line-height:1.4}
    .portal-main .row-actions,.portal-main .team-actions{margin-top:8px}
    .portal-main button,.portal-main .btn,.portal-main .tiny-btn{border-radius:12px!important}

    .mobile-table-hint{display:flex;align-items:center;gap:7px;color:#7f95ab;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin:7px 4px 6px}
    .mobile-table-hint:before{content:'↔';font-size:13px;color:#70c0f8}
    .mobile-table-shell{scrollbar-width:thin;scroll-snap-type:x proximity}
    .mobile-table-shell table th:first-child,.mobile-table-shell table td:first-child{position:sticky;left:0;z-index:2;background:#091624;box-shadow:8px 0 16px rgba(0,0,0,.15)}
    .mobile-table-shell table td:first-child{background:#0b1829}

    .mobile-app-tabbar,.public-app-dock{left:8px!important;right:8px!important;bottom:max(8px,env(safe-area-inset-bottom))!important;height:66px!important;border-radius:22px!important;padding:5px!important}
    .mobile-app-tab,.public-app-dock button{border-radius:17px!important}
    .mobile-app-tab.active,.public-app-dock button.active{background:linear-gradient(180deg,#13314e,#10263d)!important}
    .mobile-app-tab .tab-icon,.public-app-dock .app-icon{font-size:18px!important}
    .mobile-app-tab .tab-label,.public-app-dock .app-label{font-size:9px!important}

    .mobile-app-menu{background:rgba(0,0,0,.62)!important;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
    .mobile-app-menu-panel{top:max(12px,env(safe-area-inset-top))!important;border-radius:28px 28px 0 0!important}
    .mobile-app-menu-head{padding:14px 14px 11px!important}
    .mobile-app-menu-head:before{content:'';position:absolute;top:6px;left:50%;transform:translateX(-50%);width:38px;height:4px;border-radius:999px;background:rgba(255,255,255,.18)}
    .mobile-app-menu-search{padding-top:10px!important}
    .mobile-app-menu-search input{background:#0a192a!important}
    .mobile-recent-wrap{padding:8px 12px 2px;background:#081321}
    .mobile-recent-title{font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:#728aa2;font-weight:900;padding:0 5px 6px}
    .mobile-recent-row{display:flex;gap:7px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:0 1px 5px;scrollbar-width:none}
    .mobile-recent-row::-webkit-scrollbar{display:none}
    .mobile-recent-chip{appearance:none;border:1px solid rgba(255,255,255,.09);background:#0d2035;color:#c5d4e2;border-radius:999px;min-height:36px;padding:8px 11px;white-space:nowrap;font-size:10px;font-weight:800;touch-action:manipulation}
    .mobile-recent-chip:active{background:#143351}
    .mobile-tool-button{min-height:76px!important}
    .mobile-tool-copy strong{font-size:11px!important}
    .mobile-tool-copy small{font-size:8px!important}
    .mobile-menu-footer{padding-bottom:max(10px,env(safe-area-inset-bottom))!important}

    /* Portal chooser and secure forms behave like app sheets */
    #portalChooser.modal.show,#leadModal.modal.show,#careerModal.modal.show{display:flex!important;align-items:flex-end!important;justify-content:center!important;padding:0!important;background:rgba(0,0,0,.66)!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
    #portalChooser .modal-card,#leadModal .modal-card,#careerModal .modal-card{width:100%!important;max-width:none!important;max-height:min(88dvh,760px)!important;margin:0!important;border-radius:26px 26px 0 0!important;padding:22px 15px calc(18px + env(safe-area-inset-bottom))!important;border-left:0!important;border-right:0!important;border-bottom:0!important;overflow-y:auto!important;box-shadow:0 -30px 70px rgba(0,0,0,.5)!important}
    #portalChooser .modal-card:before,#leadModal .modal-card:before,#careerModal .modal-card:before{content:'';display:block;width:38px;height:4px;border-radius:999px;background:rgba(255,255,255,.18);margin:-11px auto 15px}
    #portalChooser .portal-choice-grid{grid-template-columns:1fr!important;gap:8px!important}
    #portalChooser .portal-choice{padding:15px!important;border-radius:16px!important;display:grid!important;grid-template-columns:42px 1fr!important;column-gap:12px!important;align-items:center!important}
    #portalChooser .portal-choice .icon{grid-row:1/3;width:42px!important;height:42px!important;margin:0!important}
    #portalChooser .portal-choice h4{font-size:17px!important;margin:0 0 3px!important}
    #portalChooser .portal-choice p{font-size:11px!important;line-height:1.4!important}

    .portal-login.show{display:flex!important;align-items:flex-start!important;justify-content:center!important;padding:calc(18px + env(safe-area-inset-top)) 12px calc(24px + env(safe-area-inset-bottom))!important}
    .portal-login .login-card{border-radius:22px!important;box-shadow:0 24px 70px rgba(0,0,0,.32)!important}
    .portal-login .login-card h2{letter-spacing:-.025em!important}
    .portal-login .backend-status{margin:8px 0 12px!important;border-radius:10px!important}

    /* Careers keeps every section but removes decorative clutter on phone */
    .career-page.show{padding-bottom:calc(74px + env(safe-area-inset-bottom))}
    .career-nav{position:sticky!important;top:0!important;z-index:220!important}
    .career-nav .nav-inner{height:62px!important}
    .career-nav-right .btn-ghost{display:none!important}
    .career-nav-right .btn-primary{min-height:40px!important;padding:8px 12px!important;font-size:10px!important}
    .career-logo-stage,.career-orb,.career-rings,.career-float{display:none!important}
    .career-hero-grid,.opportunity-strip-grid,.career-origin-card,.career-final-card{grid-template-columns:1fr!important}
    .career-hero-screen{min-height:auto!important;padding:42px 0!important}
    .career-hero-copy h1{font-size:clamp(38px,10vw,48px)!important;line-height:1.02!important}
    .career-actions{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
    .career-actions .btn{width:100%!important;min-height:46px!important}
    .career-system-grid{grid-template-columns:1fr!important;gap:9px!important}
    .career-system-card{padding:19px!important;border-radius:18px!important}
    .career-pulse-row{display:flex!important;overflow-x:auto!important;gap:8px!important;padding-bottom:8px!important;scrollbar-width:none}
    .career-pulse-row::-webkit-scrollbar{display:none}
    .career-pulse-row>div{min-width:105px!important;flex:0 0 105px!important;border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:12px!important}
    .career-pulse-row>i{display:none!important}

    /* public homepage refinement */
    .shell .section-title,.shell .cta h2{letter-spacing:-.025em!important}
    .shell .section-copy,.shell .card p,.shell .promise p,.shell .cta p{line-height:1.55!important}
    .shell .trust-row span{display:flex;align-items:center;min-height:48px}
  }
  @media(max-width:390px){
    .mobile-title-stack strong{max-width:52vw!important}
    .mobile-tool-grid{gap:7px!important}
    .portal-main .stat-grid,.portal-main .ai-status-grid{grid-template-columns:1fr 1fr!important}
  }`;
  document.head.appendChild(style);
}

function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function roleFromPortal(portal){if(!portal)return null;if(portal.id==='agentPortal')return'agent';if(portal.id==='adminPortal')return'admin';if(portal.id==='ownerPortal')return'owner';return null}
function routeFromLink(link){const code=link?.getAttribute('onclick')||'';const m=code.match(/show(?:Agent|Admin|Owner)View\('([^']+)'/);return m?.[1]||''}
function linkParts(link){const raw=String(link?.textContent||'').replace(/\s+/g,' ').trim();const bits=raw.split(' ');const icon=bits.length>1?bits.shift():'•';return{icon,label:bits.join(' ')||raw||'Open'}}
function routeMap(portal){const map=new Map();portal?.querySelectorAll('.sidebar .side-link').forEach(link=>{const route=routeFromLink(link);if(route)map.set(route,link)});return map}
function historyFor(portal){portal.__allshieldMobileHistory=portal.__allshieldMobileHistory||[];return portal.__allshieldMobileHistory}
function recentKey(role){return`allshield-mobile-recent-${role}`}
function getRecent(role){try{return JSON.parse(localStorage.getItem(recentKey(role))||'[]').filter(Boolean).slice(0,5)}catch{return[]}}
function markRecent(role,route){if(!role||!route||route==='more')return;const next=[route,...getRecent(role).filter(x=>x!==route)].slice(0,5);try{localStorage.setItem(recentKey(role),JSON.stringify(next))}catch{}}

function currentRoute(portal){const active=portal?.querySelector('.sidebar .side-link.active');return routeFromLink(active)||portal?.querySelector('.portal-main')?.dataset?.currentView||'dashboard'}
function animateMain(portal){const main=portal?.querySelector('.portal-main');if(!main)return;main.classList.remove('mobile-route-enter');void main.offsetWidth;main.classList.add('mobile-route-enter');setTimeout(()=>main.classList.remove('mobile-route-enter'),220)}
function showRoute(portal,role,route,options={record:true}){
  if(!portal||!role||!route)return;
  const before=currentRoute(portal);
  if(options.record!==false&&before&&before!==route){const h=historyFor(portal);if(h[h.length-1]!==before)h.push(before);if(h.length>12)h.shift()}
  const map=routeMap(portal);const link=map.get(route)||null;
  const fn=window[role==='agent'?'showAgentView':role==='admin'?'showAdminView':'showOwnerView'];
  if(typeof fn!=='function')return;
  fn(route,link);markRecent(role,route);syncPortal(portal,route);closeAppMenu(portal);closeTabletDrawer(portal);animateMain(portal);window.scrollTo({top:0,behavior:'auto'});setTimeout(()=>decoratePortalContent(portal),30)
}
function goBack(portal,role){const h=historyFor(portal);const route=h.pop();if(route)showRoute(portal,role,route,{record:false});else showRoute(portal,role,'dashboard',{record:false})}

function syncPortal(portal,forcedRoute){
  const role=roleFromPortal(portal);const route=forcedRoute||currentRoute(portal);const map=routeMap(portal);const source=map.get(route);const {label}=linkParts(source);
  const title=portal?.querySelector('.mobile-current-title');if(title)title.textContent=label||'Dashboard';
  const back=portal?.querySelector('.mobile-route-back');if(back)back.classList.toggle('visible',historyFor(portal).length>0&&route!=='dashboard');
  portal?.querySelectorAll('.mobile-app-tab').forEach(btn=>{const tabRoute=btn.dataset.route;const primary=roleConfig[role]?.tabs.some(t=>t.route===route);btn.classList.toggle('active',tabRoute===route||(tabRoute==='more'&&!primary))});
  portal?.querySelectorAll('.mobile-tool-button').forEach(btn=>btn.classList.toggle('active',btn.dataset.route===route));
  refreshRecentMenu(portal,role)
}

function closeAppMenu(portal){portal?.querySelector('.mobile-app-menu')?.classList.remove('open');if(!document.querySelector('.mobile-app-menu.open'))document.body.classList.remove('mobile-app-menu-lock')}
function openAppMenu(portal){if(!portal)return;document.querySelectorAll('.mobile-app-menu.open').forEach(menu=>{if(!portal.contains(menu))menu.classList.remove('open')});portal.querySelector('.mobile-app-menu')?.classList.add('open');document.body.classList.add('mobile-app-menu-lock');const search=portal.querySelector('.mobile-app-menu-search input');if(search){search.value='';filterMenu(portal,'')}refreshRecentMenu(portal,roleFromPortal(portal))}
function filterMenu(portal,value){const q=String(value||'').trim().toLowerCase();portal?.querySelectorAll('.mobile-tool-group').forEach(group=>{let visible=0;group.querySelectorAll('.mobile-tool-button').forEach(btn=>{const hay=(btn.dataset.search||btn.textContent||'').toLowerCase();const show=!q||hay.includes(q);btn.style.display=show?'flex':'none';if(show)visible++});group.style.display=visible?'block':'none'})}

function refreshRecentMenu(portal,role){
  const row=portal?.querySelector('.mobile-recent-row');const wrap=portal?.querySelector('.mobile-recent-wrap');if(!row||!wrap||!role)return;
  const map=routeMap(portal);const routes=getRecent(role).filter(r=>map.has(r));wrap.style.display=routes.length?'block':'none';row.innerHTML='';
  routes.forEach(route=>{const {icon,label}=linkParts(map.get(route));const btn=document.createElement('button');btn.type='button';btn.className='mobile-recent-chip';btn.textContent=`${icon} ${label}`;btn.addEventListener('click',()=>showRoute(portal,role,route));row.appendChild(btn)})
}
function buildMenu(portal,role){
  const cfg=roleConfig[role],map=routeMap(portal),menu=document.createElement('section');menu.className='mobile-app-menu';menu.setAttribute('aria-label','All tools');
  menu.innerHTML=`<div class="mobile-app-menu-panel"><div class="mobile-app-menu-head"><img src="assets/brand-9aa0ec99b3b0.webp" alt="Allshield"><div class="menu-title"><small>${esc(cfg.label)}</small><strong>All Tools</strong></div><button type="button" class="mobile-menu-close" aria-label="Close tools">×</button></div><div class="mobile-app-menu-search"><input type="search" placeholder="Search tools and sections" autocomplete="off" aria-label="Search tools"></div><div class="mobile-recent-wrap" style="display:none"><div class="mobile-recent-title">Recent</div><div class="mobile-recent-row"></div></div><div class="mobile-app-menu-scroll"></div><div class="mobile-menu-footer"><button type="button" data-menu-dashboard>⌂ Dashboard</button><button type="button" class="exit" data-menu-exit>Exit Portal</button></div></div>`;
  const scroll=menu.querySelector('.mobile-app-menu-scroll'),used=new Set();
  function addGroup(name,routes){const available=routes.filter(r=>map.has(r));if(!available.length)return;const group=document.createElement('section');group.className='mobile-tool-group';group.innerHTML=`<div class="mobile-tool-group-title">${esc(name)}</div><div class="mobile-tool-grid"></div>`;const grid=group.querySelector('.mobile-tool-grid');available.forEach(route=>{used.add(route);const link=map.get(route),{icon,label}=linkParts(link),btn=document.createElement('button');btn.type='button';btn.className='mobile-tool-button';btn.dataset.route=route;btn.dataset.search=`${label} ${route} ${name}`;btn.innerHTML=`<span class="mobile-tool-icon">${esc(icon)}</span><span class="mobile-tool-copy"><strong>${esc(label)}</strong><small>Open section</small></span>`;btn.addEventListener('click',()=>showRoute(portal,role,route));grid.appendChild(btn)});scroll.appendChild(group)}
  cfg.groups.forEach(([name,routes])=>addGroup(name,routes));const remaining=[...map.keys()].filter(route=>!used.has(route));if(remaining.length)addGroup('More',remaining);
  menu.querySelector('.mobile-menu-close').addEventListener('click',()=>closeAppMenu(portal));menu.addEventListener('click',e=>{if(e.target===menu)closeAppMenu(portal)});menu.querySelector('.mobile-app-menu-search input').addEventListener('input',e=>filterMenu(portal,e.target.value));menu.querySelector('[data-menu-dashboard]').addEventListener('click',()=>showRoute(portal,role,'dashboard'));menu.querySelector('[data-menu-exit]').addEventListener('click',()=>{closeAppMenu(portal);if(typeof window.allshieldSignOut==='function')window.allshieldSignOut();else if(typeof window.returnHome==='function')window.returnHome()});portal.appendChild(menu);refreshRecentMenu(portal,role)
}
function buildTabbar(portal,role){const cfg=roleConfig[role],bar=document.createElement('nav');bar.className='mobile-app-tabbar';bar.setAttribute('aria-label',`${cfg.label} primary navigation`);cfg.tabs.forEach(tab=>{const btn=document.createElement('button');btn.type='button';btn.className='mobile-app-tab';btn.dataset.route=tab.route;btn.innerHTML=`<span class="tab-icon">${esc(tab.icon)}</span><span class="tab-label">${esc(tab.label)}</span>`;btn.addEventListener('click',()=>tab.route==='more'?openAppMenu(portal):showRoute(portal,role,tab.route));bar.appendChild(btn)});portal.appendChild(bar)}

function closeTabletDrawer(portal){if(!portal)return;portal.classList.remove('mobile-nav-open');portal.querySelector('.mobile-portal-menu')?.setAttribute('aria-expanded','false');if(!document.querySelector('.portal-page.mobile-nav-open'))document.body.classList.remove('portal-nav-lock')}
function openTabletDrawer(portal){if(!portal)return;document.querySelectorAll('.portal-page.mobile-nav-open').forEach(p=>{if(p!==portal)closeTabletDrawer(p)});portal.classList.add('mobile-nav-open');portal.querySelector('.mobile-portal-menu')?.setAttribute('aria-expanded','true');document.body.classList.add('portal-nav-lock')}
function buildTabletDrawer(portal){const top=portal.querySelector('.portal-top'),sidebar=portal.querySelector('.sidebar');if(!top||!sidebar||portal.querySelector('.mobile-portal-menu'))return;const btn=document.createElement('button');btn.type='button';btn.className='mobile-portal-menu';btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Open portal navigation');btn.innerHTML='<span aria-hidden="true">☰</span><span>Menu</span>';const exit=top.querySelector(':scope > .btn');if(exit)top.insertBefore(btn,exit);else top.appendChild(btn);const shade=document.createElement('div');shade.className='portal-nav-backdrop';shade.setAttribute('aria-hidden','true');portal.appendChild(shade);btn.addEventListener('click',()=>portal.classList.contains('mobile-nav-open')?closeTabletDrawer(portal):openTabletDrawer(portal));shade.addEventListener('click',()=>closeTabletDrawer(portal));sidebar.addEventListener('click',e=>{if(window.innerWidth>MOBILE_BREAKPOINT&&window.innerWidth<=TABLET_BREAKPOINT&&e.target.closest('.side-link'))setTimeout(()=>closeTabletDrawer(portal),30)})}

function buildTitle(portal,role){const left=portal.querySelector('.portal-top .left');if(!left||left.querySelector('.mobile-title-stack'))return;const back=document.createElement('button');back.type='button';back.className='mobile-route-back';back.setAttribute('aria-label','Go back');back.textContent='‹';back.addEventListener('click',()=>goBack(portal,role));left.insertBefore(back,left.firstChild);const stack=document.createElement('div');stack.className='mobile-title-stack';stack.innerHTML=`<small>${esc(roleConfig[role].label)}</small><strong class="mobile-current-title">Dashboard</strong>`;left.appendChild(stack)}

function decoratePortalContent(portal){
  if(!portal||window.innerWidth>MOBILE_BREAKPOINT)return;const main=portal.querySelector('.portal-main');if(!main)return;
  main.querySelectorAll('.table-scroll,.team-table-wrap,.admin-table-wrap').forEach(wrap=>{wrap.classList.add('mobile-table-shell');wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Scrollable table');if(!wrap.previousElementSibling?.classList?.contains('mobile-table-hint')){const hint=document.createElement('div');hint.className='mobile-table-hint';hint.textContent='Swipe table to see more';wrap.parentNode.insertBefore(hint,wrap)}})
}
function enhancePortal(portal){
  if(!portal||portal.dataset.mobileAppReady==='1')return;const role=roleFromPortal(portal);if(!role||!portal.querySelector('.sidebar')||!portal.querySelector('.portal-top'))return;portal.dataset.mobileAppReady='1';buildTitle(portal,role);buildTabbar(portal,role);buildMenu(portal,role);buildTabletDrawer(portal);
  portal.querySelector('.sidebar').addEventListener('click',e=>{const link=e.target.closest('.side-link');if(link){const route=routeFromLink(link);markRecent(role,route);setTimeout(()=>{syncPortal(portal,route);decoratePortalContent(portal)},0)}});
  const sidebar=portal.querySelector('.sidebar'),main=portal.querySelector('.portal-main');new MutationObserver(()=>syncPortal(portal)).observe(sidebar,{subtree:true,attributes:true,attributeFilter:['class']});new MutationObserver(()=>decoratePortalContent(portal)).observe(main,{childList:true,subtree:true});syncPortal(portal);decoratePortalContent(portal)
}

function enhanceLogin(role){const login=document.getElementById(role+'Login');if(!login||login.dataset.mobileLoginReady==='1')return;const user=login.querySelector('input:not([type]),input[type="text"],input[type="email"]'),pass=login.querySelector('input[type="password"]'),button=login.querySelector('button.btn-primary');if(!user||!pass||!button)return;login.dataset.mobileLoginReady='1';user.type='text';user.autocomplete='username';user.setAttribute('autocapitalize','none');user.setAttribute('autocorrect','off');user.spellcheck=false;user.inputMode='email';pass.autocomplete='current-password';button.removeAttribute('onclick');const submit=async()=>{if(button.dataset.busy==='1')return;if(typeof window.productionLogin!=='function'){alert('Secure login is still loading. Please try again in a moment.');return}button.dataset.busy='1';const original=button.textContent;button.disabled=true;button.textContent='Signing in…';try{await window.productionLogin(role)}finally{button.dataset.busy='0';button.disabled=false;button.textContent=original}};button.addEventListener('click',e=>{e.preventDefault();submit()});[user,pass].forEach(input=>input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit()}}))}

function buildPublicDock(){const shell=document.querySelector('.shell');if(!shell||shell.querySelector('.public-app-dock'))return;const dock=document.createElement('nav');dock.className='public-app-dock';dock.setAttribute('aria-label','Allshield mobile navigation');dock.innerHTML=`<button type="button" data-public-action="home"><span class="app-icon">⌂</span><span class="app-label">Home</span></button><button type="button" data-public-action="coverage"><span class="app-icon">◇</span><span class="app-label">Coverage</span></button><button type="button" data-public-action="careers"><span class="app-icon">◆</span><span class="app-label">Careers</span></button><button type="button" class="public-primary" data-public-action="protect"><span class="app-icon">＋</span><span class="app-label">Protect</span></button><button type="button" data-public-action="portal"><span class="app-icon">◎</span><span class="app-label">Portal</span></button>`;dock.addEventListener('click',e=>{const btn=e.target.closest('button[data-public-action]');if(!btn)return;const action=btn.dataset.publicAction;dock.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));if(action==='home')document.getElementById('top')?.scrollIntoView({behavior:'smooth'});if(action==='coverage')document.getElementById('coverage')?.scrollIntoView({behavior:'smooth'});if(action==='careers'&&typeof window.openCareersPage==='function')window.openCareersPage();if(action==='protect'&&typeof window.openLead==='function')window.openLead();if(action==='portal'&&typeof window.openPortalChooser==='function')window.openPortalChooser()});shell.appendChild(dock)}

function closeAllMenus(){document.querySelectorAll('.portal-page').forEach(portal=>{closeAppMenu(portal);closeTabletDrawer(portal)})}
function init(){injectStyles();document.querySelectorAll('.portal-page').forEach(enhancePortal);['agent','admin','owner'].forEach(enhanceLogin);buildPublicDock()}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAllMenus()});window.addEventListener('resize',()=>{if(window.innerWidth>TABLET_BREAKPOINT)closeAllMenus();document.querySelectorAll('.portal-page').forEach(decoratePortalContent)},{passive:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();new MutationObserver(init).observe(document.documentElement,{childList:true,subtree:true});window.allshieldCloseMobilePortalNav=closeAllMenus;window.ALLSHIELD_MOBILE_APP_VERSION=VERSION;
})();