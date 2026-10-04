/* Allshield — Admin and Agent portal home screens (tile layout)
   Same idea as the Owner home screen: big buttons instead of a long side menu.
   Each tab opens an EXISTING screen by pressing its original (now hidden) menu link,
   so no screen is changed or removed. Unlisted menu links show up under "More". */
(function () {
  'use strict';

  /* [tab label, text of the original menu link] */
  var CONFIG = {
    admin: { entryView: 'dashboard', showFn: 'showAdminView', sections: [
      { key: 'dashboard', icon: '⌂', name: 'Dashboard', tabs: [['Dashboard', 'Executive Dashboard'], ['Production', 'Production'], ['Rankings & Bonuses', 'Rankings & Bonuses']] },
      { key: 'people', icon: '♟', name: 'People', tabs: [['Team & Roles', 'Team & Roles'], ['Hierarchy', 'Hierarchy & Promotions'], ['Onboarding', 'Onboarding Control'], ['Account Access', 'Account Access'], ['Recruiting', 'Recruiting & Leads']] },
      { key: 'sales', icon: '◎', name: 'Sales', tabs: [['Carriers & Programs', 'Carriers & Programs'], ['Licensing', 'Licensing Oversight']] },
      { key: 'academy', icon: '▣', name: 'Academy', tabs: [['Courses', 'Course Builder'], ['Tests & Scores', 'Tests & Scoring']] },
      { key: 'social', icon: '✦', name: 'Social', tabs: [['Marketing', 'Marketing Center'], ['Connected Accounts', 'Social Connection Center']] },
      { key: 'office', icon: '✉', name: 'Office', tabs: [['Messages', 'Communications'], ['Meetings', 'Meeting Rooms'], ['Documents & E-Sign', 'Documents & E-Sign']] },
      { key: 'system', icon: '⚙', name: 'System', tabs: [['AI Operations', 'AI Operations'], ['Automations', 'Automation Center'], ['Settings', 'System Settings']] }
    ] },
    agent: { entryView: 'onboarding', showFn: 'showAgentView', sections: [
      { key: 'licensed', icon: '①', name: 'Get Licensed', tabs: [['Get Licensed', 'Get Licensed']] },
      { key: 'training', icon: '▣', name: 'Training', tabs: [['Study', 'Study & Complete Tasks'], ['Practice Tests', 'Practice & Take Tests'], ['AI Study Help', 'AI Study Help']] },
      { key: 'sell', icon: '◎', name: 'What I Can Sell', tabs: [['Carriers & Programs', 'Carriers & Programs']] },
      { key: 'account', icon: '♟', name: 'My Account', tabs: [['My Account', 'My Account'], ['My Agreements', 'My Agreements']] }
    ] }
  };

  function makeHub(role) {
  var cfg = CONFIG[role], SECTIONS = cfg.sections;
  var MORE = { key: 'more', icon: '…', name: 'More', blurb: 'Other tools.', tabs: [] };

  var st = { section: null, tab: 0, internal: false, classic: false };
  var portal, shell, sidebar, main, hub;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  /* compare menu text without icons, emoji or extra spaces */
  function norm(s) { return String(s || '').toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9&]+/g, ' ').trim(); }
  function links() { return sidebar ? Array.prototype.slice.call(sidebar.querySelectorAll('.side-link')) : []; }
  function findLink(text) {
    var want = norm(text), all = links(), i;
    for (i = 0; i < all.length; i++) if (norm(all[i].textContent) === want) return all[i];
    for (i = 0; i < all.length; i++) if (norm(all[i].textContent).indexOf(want) >= 0) return all[i];
    return null;
  }
  /* sections with only the tabs whose original link exists right now, plus "More" for anything unlisted */
  function build() {
    var used = [], out = [];
    SECTIONS.forEach(function (s) {
      var tabs = [];
      s.tabs.forEach(function (t) { var l = findLink(t[1]); if (l && used.indexOf(l) < 0) { used.push(l); tabs.push({ label: t[0], link: l }); } });
      if (tabs.length) out.push({ key: s.key, icon: s.icon, name: s.name, blurb: s.blurb, tabs: tabs });
    });
    var extra = links().filter(function (l) { return used.indexOf(l) < 0 && norm(l.textContent); })
      .map(function (l) { return { label: l.textContent.replace(/^[^A-Za-z0-9]+/, '').trim(), link: l }; });
    if (extra.length) out.push({ key: MORE.key, icon: MORE.icon, name: MORE.name, blurb: MORE.blurb, tabs: extra });
    return out;
  }
  function locate(link) {
    var secs = build();
    for (var i = 0; i < secs.length; i++) for (var j = 0; j < secs[i].tabs.length; j++) if (secs[i].tabs[j].link === link) return { section: secs[i].key, tab: j };
    return null;
  }

  function addStyles() {
    if (document.getElementById('asHubStyles-'+role)) return;
    var s = document.createElement('style'); s.id = 'asHubStyles-' + role;
    s.textContent = [
      '#'+role+'Portal.hub-on .portal-shell{grid-template-columns:1fr}',
      '#'+role+'Portal.hub-on .sidebar{display:none!important}',
      '#'+role+'Portal.hub-on.hub-home #'+role+'Main{display:none}',
      '#'+role+'Portal:not(.hub-on) #'+role+'Hub{display:none}',
      '#'+role+'Hub{padding:26px 30px 0;background:#0a1525;min-width:0}',
      '#'+role+'Portal.hub-home #'+role+'Hub{padding-bottom:40px;min-height:calc(100vh - 76px)}',
      '.hub-kicker{font-size:12px;letter-spacing:.25em;color:#78c6ff;font-weight:800}',
      '.hub-title{font-family:Georgia,"Times New Roman",serif;font-size:34px;margin:4px 0 6px;color:#fff}',
      '.hub-lead{color:#91a4ba;margin:0 0 22px;font-size:14px}',
      '.hub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}',
      '.hub-tile{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.1);background:#0c1a2c;border-radius:18px;padding:22px;color:#e8f0f8;cursor:pointer;font:inherit;min-height:150px}',
      '.hub-tile:hover,.hub-tile:focus-visible{border-color:#3d8fd0;background:#10223a;outline:none}',
      '.hub-tile .hub-ic{font-size:26px;color:#78c6ff;line-height:1}',
      '.hub-tile b{display:block;font-family:Georgia,"Times New Roman",serif;font-size:22px;margin:10px 0 6px;color:#fff}',
      '.hub-tile span.hub-list{color:#91a4ba;font-size:13px;line-height:1.45}',
      '.hub-bar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px}',
      '.hub-home{padding:11px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:#10223a;color:#fff;font:inherit;font-weight:700;cursor:pointer}',
      '.hub-home:hover{border-color:#3d8fd0}',
      '.hub-sec{font-family:Georgia,"Times New Roman",serif;font-size:24px;color:#fff}',
      '.hub-tabs{display:flex;gap:8px;flex-wrap:wrap;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.08)}',
      '.hub-tab{padding:10px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#0c1a2c;color:#b9c8d8;font:inherit;font-weight:700;font-size:13px;cursor:pointer}',
      '.hub-tab.on{background:#10223a;color:#fff;border-color:#3d8fd0}',
      '.hub-foot{margin-top:26px;font-size:12px;color:#91a4ba}',
      '.hub-foot button,.hub-back-new{background:none;border:0;color:#7bcaff;font:inherit;font-size:12px;cursor:pointer;text-decoration:underline;padding:0}',
      '.hub-back-new{display:block;margin:0 10px 14px}',
      '@media(max-width:900px){#'+role+'Portal.hub-home #'+role+'Hub{padding-bottom:120px}}',
      '@media(max-width:600px){#'+role+'Hub{padding:18px 16px 0}.hub-title{font-size:27px}.hub-tile{min-height:0;padding:18px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function render() {
    if (!hub) return;
    portal.classList.toggle('hub-on', !st.classic);
    if (st.classic) return;
    var secs = build();
    var sec = st.section ? secs.filter(function (s) { return s.key === st.section; })[0] : null;
    if (!sec) st.section = null;
    portal.classList.toggle('hub-home', !sec);
    if (!sec) {
      hub.innerHTML = '<div class="hub-kicker">HOME</div><h2 class="hub-title">Where do you want to go?</h2><p class="hub-lead">Everything lives inside one of these buttons.</p><div class="hub-grid">' +
        secs.map(function (s) {
          return '<button type="button" class="hub-tile" data-hub-go="' + esc(s.key) + '"><span class="hub-ic">' + s.icon + '</span><b>' + esc(s.name) + '</b><span class="hub-list">' +
            s.tabs.map(function (t) { return esc(t.label); }).join(' · ') + '</span></button>';
        }).join('') + '</div><div class="hub-foot"><button type="button" data-hub-classic="1">Switch back to the old side menu</button></div>';
      return;
    }
    if (st.tab >= sec.tabs.length) st.tab = 0;
    hub.innerHTML = '<div class="hub-bar"><button type="button" class="hub-home" data-hub-home="1">⌂ Home</button><span class="hub-sec">' + esc(sec.name) + '</span></div>' +
      (sec.tabs.length > 1 ? '<div class="hub-tabs">' + sec.tabs.map(function (t, i) {
        return '<button type="button" class="hub-tab' + (i === st.tab ? ' on' : '') + '" data-hub-tab="' + i + '">' + esc(t.label) + '</button>';
      }).join('') + '</div>' : '');
  }

  function openTab(sectionKey, tabIndex) {
    var sec = build().filter(function (s) { return s.key === sectionKey; })[0];
    if (!sec) return;
    st.section = sectionKey; st.tab = Math.min(tabIndex || 0, sec.tabs.length - 1);
    render();
    var link = sec.tabs[st.tab].link;
    st.internal = true;
    try { link.click(); } finally { st.internal = false; }
    window.scrollTo(0, 0);
  }
  function goHome() { st.section = null; render(); window.scrollTo(0, 0); }

  function onHubClick(ev) {
    var t = ev.target.closest ? ev.target.closest('[data-hub-go],[data-hub-tab],[data-hub-home],[data-hub-classic]') : null;
    if (!t) return;
    if (t.hasAttribute('data-hub-go')) return openTab(t.getAttribute('data-hub-go'), 0);
    if (t.hasAttribute('data-hub-tab')) return openTab(st.section, +t.getAttribute('data-hub-tab'));
    if (t.hasAttribute('data-hub-home')) return goHome();
    if (t.hasAttribute('data-hub-classic')) { st.classic = true; render(); addClassicReturn(); }
  }
  function addClassicReturn() {
    if (!sidebar || sidebar.querySelector('.hub-back-new')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'hub-back-new'; b.textContent = '← Use the new home screen';
    b.addEventListener('click', function () { st.classic = false; st.section = null; render(); });
    sidebar.insertBefore(b, sidebar.firstChild);
  }

  /* If anything else opens a screen (a dashboard shortcut, the phone menu, another script),
     follow it so the right section and tab are showing. */
  function onSidebarClick(ev) {
    if (st.internal || st.classic) return;
    var l = ev.target.closest ? ev.target.closest('.side-link') : null;
    if (!l) return;
    var at = locate(l);
    if (at) { st.section = at.section; st.tab = at.tab; render(); }
  }
  function wrapShow() {
    var prev = window[cfg.showFn];
    if (typeof prev !== 'function' || prev.__hubWrapped) return;
    var wrapped = function (view, el) {
      var r = prev.apply(this, arguments);
      try {
        if (!st.internal && !st.classic && view && view !== cfg.entryView) {
          var l = links().filter(function (x) { return (x.getAttribute('onclick') || '').indexOf("'" + view + "'") >= 0; })[0] || el;
          var at = l ? locate(l) : null;
          if (at) { st.section = at.section; st.tab = at.tab; render(); }
        }
      } catch (e) { }
      return r;
    };
    wrapped.__hubWrapped = true;
    window[cfg.showFn] = wrapped;
  }

  function boot() {
    portal = document.getElementById(role + 'Portal');
    main = document.getElementById(role + 'Main');
    if (!portal || !main) return;
    shell = main.parentElement;
    sidebar = portal.querySelector('.sidebar');
    if (!sidebar || document.getElementById(role + 'Hub')) return;
    addStyles();
    hub = document.createElement('div');
    hub.id = role + 'Hub';
    hub.className = 'as-hub';
    shell.insertBefore(hub, main);
    hub.addEventListener('click', onHubClick);
    sidebar.addEventListener('click', onSidebarClick);
    wrapShow();
    portal.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button') : null;
      if (b && /returnHome|allshieldSignOut/.test(b.getAttribute('onclick') || '')) { st.section = null; setTimeout(render, 0); }
    });
    if (window.MutationObserver) new MutationObserver(function () { if (!st.section && !st.classic) render(); }).observe(sidebar, { childList: true, subtree: true });
    render();
  }
  boot();
  }

  function start() { makeHub('admin'); makeHub('agent'); }
  if (document.readyState === 'complete') setTimeout(start, 0);
  else window.addEventListener('load', function () { setTimeout(start, 0); });
})();
