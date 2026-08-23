(() => {
  const route = (type, view, el) => {
    const registry = type === 'agent' ? window.agentViews : type === 'admin' ? window.adminViews : window.ownerViews;
    const host = document.getElementById(type === 'agent' ? 'agentMain' : type === 'admin' ? 'adminMain' : 'ownerMain');
    if (!host || !registry) return false;
    const html = registry[view];
    if (typeof html !== 'string') {
      host.innerHTML = `<div class="bo-card"><h3>Module unavailable</h3><p>${String(view || 'Requested')} did not register correctly. Refresh and try again.</p></div>`;
      return false;
    }
    document.querySelectorAll(`#${type}Portal .sidebar .side-link`).forEach(x => x.classList.remove('active'));
    if (el) el.classList.add('active');
    host.innerHTML = html;
    return true;
  };

  // Preserve the production wrappers/loaders, but make sure the classic global
  // function names used by inline navigation resolve to the final wrapped functions.
  try { if (typeof window.showAgentView === 'function') showAgentView = window.showAgentView; } catch (_) {}
  try { if (typeof window.showAdminView === 'function') showAdminView = window.showAdminView; } catch (_) {}
  try { if (typeof window.showOwnerView === 'function') showOwnerView = window.showOwnerView; } catch (_) {}

  // Capture sidebar clicks before any stale inline handler can swallow them.
  document.addEventListener('click', e => {
    const el = e.target.closest('.portal-page .sidebar .side-link');
    if (!el) return;
    const portal = el.closest('.portal-page');
    const type = portal?.id === 'agentPortal' ? 'agent' : portal?.id === 'adminPortal' ? 'admin' : portal?.id === 'ownerPortal' ? 'owner' : null;
    if (!type) return;
    const raw = el.getAttribute('onclick') || '';
    const m = raw.match(/show(?:Agent|Admin|Owner)View\(['\"]([^'\"]+)['\"]/);
    if (!m) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const view = m[1];
    const fn = type === 'agent' ? window.showAgentView : type === 'admin' ? window.showAdminView : window.showOwnerView;
    try {
      if (typeof fn === 'function') fn(view, el);
      else route(type, view, el);
    } catch (err) {
      console.error('Allshield navigation repair fallback:', err);
      route(type, view, el);
    }
  }, true);

  window.__allshieldNavigationRepair = 'V12';
})();
