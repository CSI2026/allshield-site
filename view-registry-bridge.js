(() => {
  // app.js owns the three canonical view registries. Expose those SAME objects
  // so every production module extends one registry instead of creating parallel copies.
  if (typeof agentViews !== 'undefined') window.agentViews = agentViews;
  if (typeof adminViews !== 'undefined') window.adminViews = adminViews;
  if (typeof ownerViews !== 'undefined') window.ownerViews = ownerViews;

  const registryFor = type => type === 'agent' ? window.agentViews : type === 'admin' ? window.adminViews : window.ownerViews;
  const hostFor = type => document.getElementById(type === 'agent' ? 'agentMain' : type === 'admin' ? 'adminMain' : 'ownerMain');
  const portalFor = type => document.getElementById(type + 'Portal');

  function activate(type, el) {
    portalFor(type)?.querySelectorAll('.sidebar .side-link').forEach(link => link.classList.remove('active'));
    if (el) el.classList.add('active');
  }

  function render(type, view, el) {
    const registry = registryFor(type);
    const host = hostFor(type);
    activate(type, el);

    if (!host) {
      console.error(`Allshield ${type} host is missing.`);
      return false;
    }
    if (!registry || typeof registry[view] !== 'string') {
      host.innerHTML = `<div class="bo-card"><h3>Module unavailable</h3><p>The ${String(view || 'requested')} module did not register correctly. Refresh the page and check System Health.</p></div>`;
      console.error(`Allshield ${type} view is not registered:`, view);
      return false;
    }

    host.innerHTML = registry[view];
    return true;
  }

  // One canonical navigation implementation. Later feature modules may wrap these
  // functions only to run their view-specific live-data loader after this render.
  window.showAgentView = function(view, el) { return render('agent', view, el); };
  window.showAdminView = function(view, el) { return render('admin', view, el); };
  window.showOwnerView = function(view, el) { return render('owner', view, el); };

  window.__allshieldViewRegistryReady = true;
})();
