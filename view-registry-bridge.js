(() => {
  // app.js defines these registries with top-level const. Classic scripts share the
  // global lexical environment, but top-level const values are not properties on
  // window. Production modules extend window.*Views, so expose the SAME objects.
  if (typeof agentViews !== 'undefined') window.agentViews = agentViews;
  if (typeof adminViews !== 'undefined') window.adminViews = adminViews;
  if (typeof ownerViews !== 'undefined') window.ownerViews = ownerViews;

  const registryFor = type => type === 'agent' ? window.agentViews : type === 'admin' ? window.adminViews : window.ownerViews;
  const hostFor = type => document.getElementById(type === 'agent' ? 'agentMain' : type === 'admin' ? 'adminMain' : 'ownerMain');

  function installSafeShow(type, name) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function(view, el) {
      const registry = registryFor(type);
      const host = hostFor(type);
      if (!registry || typeof registry[view] !== 'string') {
        if (el && typeof window.setActive === 'function') window.setActive(el);
        if (host) host.innerHTML = `<div class="bo-card"><h3>Module unavailable</h3><p>The ${String(view || 'requested')} module did not register correctly. Refresh the page; if this remains, use System Health to report it.</p></div>`;
        console.error(`Allshield ${type} view is not registered:`, view);
        return;
      }
      return original(view, el);
    };
  }

  installSafeShow('agent','showAgentView');
  installSafeShow('admin','showAdminView');
  installSafeShow('owner','showOwnerView');
  window.__allshieldViewRegistryReady = true;
})();
