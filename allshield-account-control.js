/* Allshield — Account Control.
   Adds an "Account Control" box to each agent's Master Agent Profile for the owner and the admins the owner picks:
     • Set a new password (and keep it visible until the agent changes it)
     • End the agreement (locks the agent out, keeps every record)  • Restore
   Adds a "Who can control agent accounts" box to the owner's Team Accounts screen.
   Also shows a clear note when an owner or admin previews the agent "Get Licensed" screen.
   Nothing existing is removed or changed. */
(function () {
  'use strict';
  var lastId = null, access = null, busy = false;
  function client() { return window.allshieldSupabase || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  async function call(body) {
    var c = client(); if (!c) throw new Error('Not connected. Please sign in again.');
    var r = await c.functions.invoke('account-control', { body: body });
    if (r.error) { var msg = ''; try { msg = (await r.error.context.json()).error; } catch (e) { } throw new Error(msg || 'Account control is not available right now.'); }
    if (r.data && r.data.error) throw new Error(r.data.error);
    return r.data;
  }
  async function whoami() {
    if (access) return access;
    try { access = await call({ action: 'whoami' }); } catch (e) { return { allowed: false, isOwner: false }; }
    return access;
  }
  function when(d) { try { return new Date(d).toLocaleString(); } catch (e) { return ''; } }
  function style() {
    if (document.getElementById('asAcctStyle')) return;
    var s = document.createElement('style'); s.id = 'asAcctStyle';
    s.textContent = '#asAcctCard,#asAcctAdmins{margin-top:18px}#asAcctCard .ac-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px}' +
      '#asAcctCard .ac-pw{font:700 17px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.5px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);user-select:all}' +
      '.ac-btn{padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:#155e9b;color:#fff;font-weight:700;cursor:pointer}.ac-btn:disabled{opacity:.5;cursor:wait}' +
      '.ac-btn.ghost{background:transparent}.ac-btn.danger{background:#8f1d1d;border-color:#c0392b}.ac-btn.good{background:#17693a;border-color:#2e9e5b}' +
      '.ac-note{opacity:.8;font-size:13px;margin-top:8px}.ac-flag{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;background:#8f1d1d;color:#fff}' +
      '#asAcctAdmins label{display:flex;gap:10px;align-items:center;padding:8px 0;cursor:pointer}#asAcctAdmins input{width:18px;height:18px}';
    document.head.appendChild(s);
  }
  /* ---------- the box on the Master Agent Profile ---------- */
  function paintCard(card, d, uid) {
    var h = '<h3>Account Control</h3>';
    if (d.ended) {
      h += '<p><span class="ac-flag">AGREEMENT ENDED</span> ' + (d.ended_at ? 'on ' + esc(when(d.ended_at)) : '') + '</p>' +
        '<p class="ac-note">This agent cannot sign in. Their file, documents and history are all kept.</p>' +
        '<div class="ac-row"><button class="ac-btn good" data-ac="restore">Restore this agent</button></div>';
    } else {
      h += '<p class="ac-note">Nobody can read an agent\'s own password. Set a new one here and give it to the agent. The old one stops working right away.</p>';
      if (d.password) h += '<div class="ac-row"><span>Current password you set:</span><span class="ac-pw" id="asAcctPw">' + esc(d.password) + '</span><button class="ac-btn ghost" data-ac="copy">Copy</button></div><p class="ac-note">Set ' + esc(when(d.set_at)) + '. It stays here until the agent changes it.</p>';
      else if (d.changed) h += '<p class="ac-note">The agent changed their password after you last set it (' + esc(when(d.set_at)) + '), so it is no longer shown.</p>';
      else h += '<p class="ac-note">No password has been set from here yet.</p>';
      h += '<div class="ac-row"><button class="ac-btn" data-ac="setpw">Set new password</button><button class="ac-btn danger" data-ac="end">End agreement</button></div>';
    }
    h += '<p class="ac-note" id="asAcctMsg"></p>';
    card.innerHTML = h;
    card.onclick = async function (ev) {
      var b = ev.target.closest('[data-ac]'); if (!b || busy) return;
      var act = b.getAttribute('data-ac'), msg = card.querySelector('#asAcctMsg');
      if (act === 'copy') { try { await navigator.clipboard.writeText(d.password); msg.textContent = 'Copied.'; } catch (e) { msg.textContent = 'Select the password and copy it.'; } return; }
      if (act === 'setpw' && !confirm('Set a new password for this agent? Their current password will stop working.')) return;
      if (act === 'end' && !confirm('End the agreement with this agent?\n\nThey will be locked out right away. Their records are kept, and you can restore them later.')) return;
      if (act === 'restore' && !confirm('Restore this agent? They will be able to sign in again after you set a new password.')) return;
      busy = true; b.disabled = true; msg.textContent = 'Working…';
      try {
        await call({ action: act === 'setpw' ? 'set_password' : act === 'end' ? 'end_agreement' : 'restore', user_id: uid });
        paintCard(card, await call({ action: 'get', user_id: uid }), uid);
      } catch (e) { msg.textContent = e.message || String(e); b.disabled = false; }
      busy = false;
    };
  }
  async function addCard(main) {
    if (!lastId || main.querySelector('#asAcctCard')) return;
    var pane = main.querySelector('.as-master-pane'); if (!pane) return;
    var uid = lastId, card = document.createElement('div');
    card.className = 'bo-card'; card.id = 'asAcctCard'; card.setAttribute('data-no-translate', '');
    card.innerHTML = '<h3>Account Control</h3><p class="ac-note">Loading…</p>';
    pane.appendChild(card);
    var me = await whoami();
    if (!me.allowed) { card.remove(); return; }
    try { paintCard(card, await call({ action: 'get', user_id: uid }), uid); }
    catch (e) { if (/only works on agent/i.test(e.message)) card.remove(); else card.innerHTML = '<h3>Account Control</h3><p class="ac-note">' + esc(e.message) + '</p>'; }
  }
  /* ---------- owner: choose which admins have account control ---------- */
  function paintAdmins(box, list) {
    box.innerHTML = '<h3>Who can control agent accounts</h3><p class="ac-note">You always can. Tick the admins who may also set agent passwords and end agreements.</p>' +
      (list.length ? list.map(function (a) { var n = ((a.first_name || '') + ' ' + (a.last_name || '')).trim() || a.username || 'Admin'; return '<label><input type="checkbox" data-uid="' + esc(a.id) + '"' + (a.on ? ' checked' : '') + '> ' + esc(n) + (a.username ? ' <span class="ac-note" style="margin:0">(' + esc(a.username) + ')</span>' : '') + '</label>'; }).join('') : '<p class="ac-note">There are no admin accounts yet.</p>') +
      '<p class="ac-note" id="asAcctAdminMsg"></p>';
    box.onchange = async function (ev) {
      var cb = ev.target; if (!cb.matches || !cb.matches('input[data-uid]')) return;
      var msg = box.querySelector('#asAcctAdminMsg'); msg.textContent = 'Saving…';
      try { var r = await call({ action: 'set_admin', user_id: cb.getAttribute('data-uid'), on: cb.checked }); paintAdmins(box, r.admins || []); box.querySelector('#asAcctAdminMsg').textContent = 'Saved.'; }
      catch (e) { cb.checked = !cb.checked; msg.textContent = e.message || String(e); }
    };
  }
  async function addAdmins(main) {
    if (main.querySelector('#asAcctAdmins')) return;
    var box = document.createElement('div'); box.className = 'bo-card'; box.id = 'asAcctAdmins'; box.setAttribute('data-no-translate', '');
    box.innerHTML = '<h3>Who can control agent accounts</h3><p class="ac-note">Loading…</p>';
    main.appendChild(box);
    var me = await whoami(); if (!me.isOwner) { box.remove(); return; }
    try { paintAdmins(box, (await call({ action: 'list_admins' })).admins || []); } catch (e) { box.innerHTML = '<h3>Who can control agent accounts</h3><p class="ac-note">' + esc(e.message) + '</p>'; }
  }
  /* ---------- owner/admin preview of the agent "Get Licensed" screen ---------- */
  async function fixPreview(main) {
    var card = Array.prototype.find.call(main.querySelectorAll('*'), function (h) { return !h.children.length && /could not load your (licensing )?path/i.test(h.textContent); });
    if (!card || card.getAttribute('data-as-preview')) return;
    card.setAttribute('data-as-preview', '1');
    var c = client(); if (!c) return;
    try {
      var u = (await c.auth.getUser()).data.user; if (!u) return;
      var p = (await c.from('profiles').select('role').eq('id', u.id).maybeSingle()).data;
      if (!p || p.role === 'agent') return;
      card.textContent = 'Preview only';
      var next = card.nextElementSibling;
      var note = 'You are signed in as ' + p.role + '. This screen shows each agent their own licensing path, so there is nothing to load for your account. Sign in with an agent account to see it the way an agent does.';
      if (next && !next.querySelector('button') && next.tagName !== 'BUTTON') next.textContent = note; else card.insertAdjacentHTML('afterend', '<p>' + esc(note) + '</p>');
      Array.prototype.forEach.call(card.parentNode.querySelectorAll('button'), function (b) { if (/try again/i.test(b.textContent)) b.style.display = 'none'; });
    } catch (e) { }
  }
  /* ---------- wiring ---------- */
  function kicker(main) { var k = main.querySelector('.dashboard-head .kicker'); return k ? k.textContent.trim().toUpperCase() : ''; }
  function check() {
    ['ownerMain', 'adminMain'].forEach(function (id) {
      var m = document.getElementById(id); if (!m) return;
      var k = kicker(m);
      if (k === 'MASTER AGENT PROFILE') addCard(m);
      else if (k === 'TEAM ACCOUNTS' && id === 'ownerMain' && m.querySelector('table')) addAdmins(m);
    });
    var a = document.getElementById('agentMain'); if (a) fixPreview(a);
  }
  function hookOpen() {
    var f = window.openAgentMasterProfile;
    if (typeof f !== 'function' || f.__asAcct) return;
    var w = function (id) { lastId = id; return f.apply(this, arguments); };
    w.__asAcct = true; window.openAgentMasterProfile = w;
  }
  function boot() {
    style(); hookOpen(); setInterval(hookOpen, 2000);
    /* The site blocks whole-page observers on purpose, so each portal screen is watched on its own. */
    var t = null, seen = [];
    function later() { clearTimeout(t); t = setTimeout(check, 250); }
    function watch() {
      ['ownerMain', 'adminMain', 'agentMain'].forEach(function (id) {
        var m = document.getElementById(id); if (!m || seen.indexOf(m) >= 0 || !window.MutationObserver) return;
        seen.push(m); new MutationObserver(later).observe(m, { childList: true, subtree: true });
      });
    }
    watch(); setInterval(function () { watch(); check(); }, 2000);
    var c = client(); if (c && c.auth && c.auth.onAuthStateChange) c.auth.onAuthStateChange(function () { access = null; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
