(() => {
  const FULL = window.ALLSHIELD_APPROVED_FULL;
  const SHIELD = window.ALLSHIELD_APPROVED_SHIELD;
  if (!FULL || !SHIELD) return;
  window.ALLSHIELD_APPROVED_LOGO = FULL;

  const style = document.createElement('style');
  style.id = 'allshield-approved-brand-layout';
  style.textContent = `
    .brand{display:flex!important;align-items:center!important;gap:12px!important;min-width:0}
    .brand img{width:48px!important;height:48px!important;object-fit:contain!important;flex:0 0 48px!important;filter:none!important}
    .brand span{white-space:nowrap}
    .hero{grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr)!important;gap:54px!important}
    .logo-stage{min-height:540px!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:visible!important}
    .logo-panel{width:min(520px,100%)!important;padding:0!important;margin:0 auto!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important}
    .logo-panel .hero-shield{display:block!important;width:100%!important;max-width:500px!important;height:auto!important;object-fit:contain!important;filter:drop-shadow(0 28px 32px rgba(0,0,0,.46))!important}
    .logo-panel .hero-wordmark,.logo-panel .logo-gap{display:none!important}
    .career-logo-stage{display:flex!important;align-items:center!important;justify-content:center!important}
    .career-lockup-fixed{width:min(480px,100%)!important;display:flex!important;align-items:center!important;justify-content:center!important}
    .career-lockup-fixed .career-shield-fixed{display:block!important;width:100%!important;max-width:440px!important;height:auto!important;object-fit:contain!important}
    .career-lockup-fixed .career-word-fixed,.career-lockup-fixed .career-logo-gap{display:none!important}
    .portal-top img{width:44px!important;height:44px!important;object-fit:contain!important}
    .login-card img{display:block!important;width:min(300px,82%)!important;height:auto!important;object-fit:contain!important;margin:0 auto 18px!important}
    @media(max-width:900px){.hero{grid-template-columns:1fr!important;gap:28px!important}.logo-stage{min-height:420px!important}.logo-panel .hero-shield{max-width:420px!important}}
    @media(max-width:600px){.brand img{width:44px!important;height:44px!important;flex-basis:44px!important}.logo-stage{min-height:350px!important}.logo-panel .hero-shield{max-width:340px!important}}
  `;
  document.head.appendChild(style);

  function normalize(root=document){
    const set=(el,src)=>{ if(el){ el.src=src; el.dataset.allshieldApprovedLogo='true'; }};
    root.querySelectorAll?.('.brand img').forEach(el=>set(el,SHIELD));
    root.querySelectorAll?.('.hero-shield,.career-shield-fixed,.login-card img').forEach(el=>set(el,FULL));
    root.querySelectorAll?.('.portal-top img,.career-brand img').forEach(el=>set(el,SHIELD));
    document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(link=>link.setAttribute('href',SHIELD));
  }

  normalize();
  document.addEventListener('DOMContentLoaded',()=>normalize());
  window.addEventListener('load',()=>normalize());
  const obs=new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)normalize(n)})));
  if(document.body) obs.observe(document.body,{childList:true,subtree:true});
})();
