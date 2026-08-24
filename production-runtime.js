(() => {
  const sb = window.allshieldSupabase;
  if (!sb) return;

  const safeView = (title = 'Live module') => `
    <div class="dashboard-head"><div><div class="kicker">ALLSHIELD LIVE</div><h2>${title}</h2><p>This module is waiting for its live data service. No demo data is displayed.</p></div></div>
    <div class="real-data-banner">LIVE DATA ONLY</div>
    <div class="bo-card"><p>Live data is currently unavailable. Refresh the page or check System Health.</p></div>`;

  const fakePattern = /(interactive demo|demo:|demo\.|demo room|demo fields|example dashboard|preview test|jordan miles|ashley reed|marcus hill|taylor brooks|good evening, calvin|1,240 questions)/i;

  function scrubRegistry(registry, label) {
    if (!registry) return;
    for (const [key, html] of Object.entries(registry)) {
      if (typeof html === 'string' && fakePattern.test(html)) {
        registry[key] = safeView(`${label} ${String(key).replace(/[_-]+/g, ' ')}`);
      }
    }
  }

  scrubRegistry(window.agentViews, 'Agent');
  scrubRegistry(window.adminViews, 'Admin');
  scrubRegistry(window.ownerViews, 'Owner');

  function installSecureLogin(id, role) {
    const card = document.getElementById(id);
    if (!card) return;
    const user = card.querySelector('input:not([type="password"])');
    const button = card.querySelector('button.btn-primary');
    if (user) user.placeholder = 'Username';
    if (button) {
      button.textContent = `Enter ${role[0].toUpperCase() + role.slice(1)} Portal`;
      button.onclick = async () => {
        await window.productionLogin(role);
        if (document.getElementById(role + 'Portal')?.classList.contains('show')) {
          sessionStorage.setItem('allshield.portalRole', role);
        }
      };
    }
  }

  installSecureLogin('agentLogin', 'agent');
  installSecureLogin('adminLogin', 'admin');
  installSecureLogin('ownerLogin', 'owner');

  document.querySelectorAll('.portal-top .btn-ghost').forEach(btn => {
    btn.textContent = 'Sign Out';
    btn.onclick = async () => {
      sessionStorage.removeItem('allshield.portalRole');
      if (typeof window.allshieldSignOut === 'function') await window.allshieldSignOut();
      else window.returnHome();
    };
  });

  const originalReturnHome = window.returnHome;
  if (typeof originalReturnHome === 'function') {
    window.returnHome = function(...args) {
      sessionStorage.removeItem('allshield.portalRole');
      return originalReturnHome.apply(this, args);
    };
  }

  function syncHiddenDashboard(role, registry) {
    const portal = document.getElementById(role + 'Portal');
    const host = document.getElementById(role === 'agent' ? 'agentMain' : role === 'admin' ? 'adminMain' : 'ownerMain');
    if (!portal || !host || portal.classList.contains('show')) return;
    if (registry?.dashboard && typeof registry.dashboard === 'string') host.innerHTML = registry.dashboard;
  }

  syncHiddenDashboard('agent', window.agentViews);
  syncHiddenDashboard('admin', window.adminViews);
  syncHiddenDashboard('owner', window.ownerViews);

  async function loadRoleDashboard(role) {
    const fn = role === 'agent' ? window.loadLiveAgentDashboard : role === 'admin' ? window.loadAdminLiveDashboard : window.loadOwnerLiveDashboard;
    if (typeof fn !== 'function') throw new Error(`Live ${role} dashboard loader is unavailable.`);
    await Promise.race([
      Promise.resolve(fn()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Live dashboard timed out.')), 12000))
    ]);
  }

  async function restorePortalSession() {
    const requestedRole = sessionStorage.getItem('allshield.portalRole');
    if (!requestedRole || !['agent', 'admin', 'owner'].includes(requestedRole)) return;

    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError || !sessionData?.session?.user) {
      sessionStorage.removeItem('allshield.portalRole');
      return;
    }

    const user = sessionData.session.user;
    const { data: profile, error } = await sb
      .from('profiles')
      .select('id,email,first_name,last_name,role,status,resident_state,department_id,manager_id')
      .eq('id', user.id)
      .single();

    if (error || !profile || profile.status === 'disabled') {
      sessionStorage.removeItem('allshield.portalRole');
      return;
    }

    const allowed = {
      agent: ['agent', 'team_lead', 'manager', 'admin', 'owner'],
      admin: ['admin', 'owner'],
      owner: ['owner']
    };
    if (!allowed[requestedRole].includes(profile.role)) {
      sessionStorage.removeItem('allshield.portalRole');
      return;
    }

    window.currentAllshieldProfile = profile;
    if (typeof window.hideSite === 'function') window.hideSite();
    window.enterPortal(requestedRole);

    try {
      await loadRoleDashboard(requestedRole);
    } catch (err) {
      const host = document.getElementById(requestedRole === 'agent' ? 'agentMain' : requestedRole === 'admin' ? 'adminMain' : 'ownerMain');
      if (host) host.innerHTML = safeView(`${requestedRole[0].toUpperCase() + requestedRole.slice(1)} dashboard`);
      console.error(err);
    }
  }

  restorePortalSession().catch(err => console.error('Allshield session restore failed:', err));

  window.addEventListener('unhandledrejection', event => {
    console.error('Allshield live request failed:', event.reason);
  });

  window.__allshieldProductionRuntimeReady = true;
})();
