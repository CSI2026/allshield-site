(() => {
  'use strict';

  const VERSION='2026.08.28.001';
  let attempts=0;

  function getTeamHtml(){
    try{
      if(typeof ownerViews!=='undefined' && typeof ownerViews.teamaccounts==='string') return ownerViews.teamaccounts;
    }catch{}
    return window.ownerViews?.teamaccounts || '';
  }

  async function renderLiveTeamAccounts(main){
    const html=getTeamHtml();
    if(!html || !html.includes('Agent Email / Invite Email (Required)') || !html.includes('id="teamEmail"')){
      main.innerHTML='<div class="bo-card"><h3>Team Accounts is updating</h3><p>The current onboarding form did not finish loading. Refresh once; if this remains visible, ALLSHIELD has blocked the older form instead of showing an incomplete account creator.</p></div>';
      throw new Error('Email-enabled Team Accounts form is not registered.');
    }

    main.innerHTML=html;
    try{ if(typeof window.loadTeamDepartments==='function') await window.loadTeamDepartments(); else if(typeof loadTeamDepartments==='function') await loadTeamDepartments(); }catch(e){ console.error('Team department load:',e); }
    try{ window.syncManualCredentials?.(); }catch(e){ console.error(e); }
    try{ window.syncManualRoleFields?.(); }catch(e){ console.error(e); }
    try{ if(typeof window.refreshTeamAccounts==='function') await window.refreshTeamAccounts(); else if(typeof refreshTeamAccounts==='function') await refreshTeamAccounts(); }catch(e){ console.error('Team account refresh:',e); }
  }

  function install(){
    if(typeof window.registerAllshieldView!=='function'){
      if(attempts++<100) setTimeout(install,50);
      return;
    }
    window.registerAllshieldView('owner','teamaccounts',renderLiveTeamAccounts);
    window.ALLSHIELD_TEAM_ACCOUNTS_INVITE_OVERRIDE_VERSION=VERSION;
  }

  install();
})();
