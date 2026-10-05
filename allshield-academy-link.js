/* Allshield — the new Academy inside the back office
   - Agent, Admin and Owner portals get an "Allshield Academy" screen (the full course).
   - Admin and Owner get "Academy Progress": every agent's progress and scores.
   - The old academy's menu links are taken out of the menus so the new Academy is the only
     training anyone sees. Adding "?oldacademy=1" to the address shows the old links again. */
(function () {
  'use strict';
  var KEEP_OLD = /[?&]oldacademy=1\b/.test(location.search);
  var OLD = { agent: ['Study & Complete Tasks', 'Practice & Take Tests', 'AI Study Help'], admin: ['Course Builder', 'Tests & Scoring'], owner: ['Academy Governance', 'Agent Testing & Scores', 'Content Versioning'] };
  var st = { portal: 'agent' };
  function sb() { return window.allshieldSupabase || null; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9&]+/g, ' ').trim(); }
  function host() { return document.getElementById(st.portal + 'Main'); }
  function addStyles() {
    if (document.getElementById('aalStyles')) return;
    var s = document.createElement('style'); s.id = 'aalStyles';
    s.textContent = '.aal-frame{width:100%;height:calc(100vh - 150px);min-height:640px;border:0;border-radius:18px;background:#f3f6fb;display:block}' +
      '.aal-wrap{overflow:auto;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:#0c1a2c}' +
      '.aal-table{width:100%;border-collapse:collapse;min-width:760px;font-size:13px}.aal-table th,.aal-table td{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.07);text-align:left;white-space:nowrap}' +
      '.aal-table th{font-size:11px;letter-spacing:.12em;color:#7bcaff;text-transform:uppercase}' +
      '.aal-bar{display:inline-block;width:90px;height:8px;border-radius:999px;background:#27415d;vertical-align:middle;margin-right:8px;overflow:hidden}.aal-bar i{display:block;height:100%;background:linear-gradient(90deg,#237fc7,#77c8ff)}' +
      '@media(max-width:900px){.aal-frame{height:calc(100vh - 210px)}}';
    document.head.appendChild(s);
  }
  function courseScreen() {
    host().innerHTML = '<iframe class="aal-frame" title="Allshield Academy" src="./allshield-academy.html?embed=1"></iframe>';
  }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function when(iso) { var d = new Date(iso); if (isNaN(d)) return '—'; var days = Math.floor((Date.now() - d.getTime()) / 86400000); return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 30 ? days + ' days ago' : d.toLocaleDateString(); }
  async function progressScreen() {
    var h = host();
    h.innerHTML = '<div class="dashboard-head"><div><div class="kicker">ACADEMY PROGRESS</div><h2>How every agent is doing.</h2><p>Progress and scores from the Allshield Academy. It updates as agents study.</p></div><button class="btn btn-primary" data-aal="refresh">Refresh</button></div><div id="aalBody"><div class="bo-card">Loading…</div></div>';
    var body = document.getElementById('aalBody');
    try {
      var c = sb(); if (!c) throw new Error('Not connected to Supabase. Sign in again.');
      var r = await Promise.all([
        c.from('academy_progress').select('user_id,prep_done,prep_total,training_done,training_total,best_exam,tutor_questions,updated_at').order('updated_at', { ascending: false }),
        c.from('profiles').select('id,first_name,last_name,username,role,status').in('role', ['agent', 'team_lead', 'manager']).order('last_name')
      ]);
      if (r[0].error) throw r[0].error; if (r[1].error) throw r[1].error;
      var by = {}; (r[0].data || []).forEach(function (x) { by[x.user_id] = x; });
      var people = (r[1].data || []).slice().sort(function (a, b) { var A = by[a.id], B = by[b.id]; return (B ? Date.parse(B.updated_at) : 0) - (A ? Date.parse(A.updated_at) : 0); });
      if (!people.length) { body.innerHTML = '<div class="bo-card">No agents yet.</div>'; return; }
      body.innerHTML = '<div class="aal-wrap"><table class="aal-table"><thead><tr><th>Agent</th><th>Status</th><th>Pre-licensing course</th><th>Allshield training</th><th>Best exam score</th><th>Questions to Ava</th><th>Last studied</th></tr></thead><tbody>' +
        people.map(function (p) {
          var x = by[p.id], name = ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || p.username || '—';
          if (!x) return '<tr><td>' + esc(name) + '</td><td>' + esc(p.status) + '</td><td colspan="5" style="color:#91a4ba">Has not started</td></tr>';
          var a = pct(x.prep_done, x.prep_total), b = pct(x.training_done, x.training_total);
          return '<tr><td>' + esc(name) + '</td><td>' + esc(p.status) + '</td>' +
            '<td><span class="aal-bar"><i style="width:' + a + '%"></i></span>' + a + '% (' + x.prep_done + ' of ' + x.prep_total + ')</td>' +
            '<td><span class="aal-bar"><i style="width:' + b + '%"></i></span>' + b + '% (' + x.training_done + ' of ' + x.training_total + ')</td>' +
            '<td>' + (x.best_exam == null ? '—' : x.best_exam + '%') + '</td><td>' + (x.tutor_questions || 0) + '</td><td>' + esc(when(x.updated_at)) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } catch (e) { body.innerHTML = '<div class="bo-card"><h3>Could not load</h3><p>' + esc(e.message || e) + '</p></div>'; }
  }
  function open(portal, screen) { st.portal = portal; if (!host()) return; addStyles(); return screen === 'progress' ? progressScreen() : courseScreen(); }
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target.closest('[data-aal]') : null; if (!t) return;
    var a = t.getAttribute('data-aal');
    if (a === 'refresh') return void progressScreen();
    if (a === 'open') { t.parentElement.querySelectorAll('.side-link').forEach(function (x) { x.classList.remove('active'); }); t.classList.add('active'); open(t.getAttribute('data-portal'), t.getAttribute('data-screen')); }
  });
  function addLink(portal, screen, label) {
    var bar = document.querySelector('#' + portal + 'Portal .sidebar');
    if (!bar || bar.querySelector('[data-aal="open"][data-screen="' + screen + '"]')) return;
    var link = document.createElement('div');
    link.className = 'side-link'; link.setAttribute('data-aal', 'open'); link.setAttribute('data-portal', portal); link.setAttribute('data-screen', screen);
    link.setAttribute('role', 'button'); link.setAttribute('tabindex', '0'); link.textContent = '▣ ' + label;
    link.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); link.click(); } });
    var links = bar.querySelectorAll('.side-link'), after = null;
    links.forEach(function (x) { if (/get licensed|licensing|carriers & programs/i.test(x.textContent || '')) after = x; });
    if (after && after.parentElement) after.parentElement.insertBefore(link, after.nextSibling);
    else if (links.length) links[links.length - 1].parentElement.appendChild(link); else bar.appendChild(link);
  }
  function removeOld() {
    if (KEEP_OLD) return;
    Object.keys(OLD).forEach(function (portal) {
      var bar = document.querySelector('#' + portal + 'Portal .sidebar'); if (!bar) return;
      var names = OLD[portal].map(norm);
      bar.querySelectorAll('.side-link').forEach(function (l) { var t = norm(l.textContent); if (names.some(function (n) { return t === n || t.replace(/^[0-9]+ /, '') === n; })) l.remove(); });
    });
  }
  function boot() {
    addStyles();
    addLink('agent', 'course', 'Allshield Academy');
    addLink('admin', 'course', 'Allshield Academy'); addLink('admin', 'progress', 'Academy Progress');
    addLink('owner', 'course', 'Allshield Academy'); addLink('owner', 'progress', 'Academy Progress');
    removeOld();
  }
  /* anything that still tries to open an old academy screen (a button on another page, a
     dashboard shortcut) is sent to the new Academy instead */
  var REDIRECT = { agent: { fn: 'showAgentView', map: { study: 'course', tests: 'course', ai: 'course' } }, admin: { fn: 'showAdminView', map: { courses: 'course', tests: 'progress' } }, owner: { fn: 'showOwnerView', map: { academy: 'course', testing: 'progress', versions: 'course' } } };
  function hookOld() {
    if (KEEP_OLD) return;
    Object.keys(REDIRECT).forEach(function (portal) {
      var r = REDIRECT[portal], old = window[r.fn];
      if (typeof old !== 'function' || old.__aal) return;
      var w = function (view) {
        var to = r.map[view];
        if (to) { var link = document.querySelector('#' + portal + 'Portal [data-aal="open"][data-screen="' + to + '"]'); if (link) { link.click(); return; } }
        return old.apply(this, arguments);
      };
      w.__aal = true; window[r.fn] = w;
    });
  }
  hookOld();
  boot();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', function () {
    boot();
    if (KEEP_OLD || !window.MutationObserver) return;
    ['agent', 'admin', 'owner'].forEach(function (p) { var bar = document.querySelector('#' + p + 'Portal .sidebar'); if (bar) new MutationObserver(removeOld).observe(bar, { childList: true, subtree: true }); });
  });
  window.allshieldAcademy = { open: open };
})();
