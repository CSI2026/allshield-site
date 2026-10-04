/* Allshield — Carriers & Programs catalog
   Owner + Admin: add / edit carriers, programs and states.
   Agents: read-only list of what is switched on for them.
   Data lives in Supabase tables catalog_* (row-level security: only owner/admin can write). */
(function () {
  'use strict';

  var ACCESS_OPTIONS = ['Direct contract', 'First Connect', 'Other'];
  var state = { pillars: [], licenses: [], states: [], carriers: [], programs: [], tab: 'programs', portal: 'owner', form: null, busy: false };

  function sb() { return window.allshieldSupabase || null; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function say(msg) { if (typeof window.toast === 'function') { try { window.toast(msg); return; } catch (e) { } } }
  function host(portal) { return document.getElementById((portal || state.portal) + 'Main'); }

  /* ---------- styles ---------- */
  function addStyles() {
    if (document.getElementById('asCatalogStyles')) return;
    var s = document.createElement('style');
    s.id = 'asCatalogStyles';
    s.textContent = [
      '.asc-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}',
      '.asc-tab{padding:11px 18px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#0c1a2c;color:#b9c8d8;font-size:14px;font-weight:700;cursor:pointer}',
      '.asc-tab.on{background:#10223a;color:#fff;border-color:#3d8fd0}',
      '.asc-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}',
      '.asc-bar p{margin:0;color:#91a4ba;font-size:13px}',
      '.asc-pillar{border:1px solid rgba(255,255,255,.09);background:#0c1a2c;border-radius:18px;padding:18px 20px;margin-bottom:14px}',
      '.asc-pillar h3{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:22px}',
      '.asc-lic{color:#91a4ba;font-size:12px;margin:4px 0 12px}',
      '.asc-row{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 0;border-top:1px solid rgba(255,255,255,.07);flex-wrap:wrap}',
      '.asc-row-main{min-width:0;flex:1 1 260px}',
      '.asc-name{font-size:15px;font-weight:700;color:#fff;overflow-wrap:anywhere}',
      '.asc-sub{font-size:12px;color:#91a4ba;margin-top:3px;overflow-wrap:anywhere}',
      '.asc-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.asc-chip{display:inline-block;padding:4px 9px;border-radius:999px;background:#102b46;color:#7bcaff;font-size:11px;margin:4px 4px 0 0}',
      '.asc-chip.off{background:#2a2230;color:#d8a9b4}',
      '.asc-empty{color:#91a4ba;font-size:13px;padding:10px 0}',
      '.asc-switch{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:#b9c8d8;cursor:pointer;user-select:none}',
      '.asc-switch input{position:absolute;opacity:0;width:0;height:0}',
      '.asc-track{width:42px;height:24px;border-radius:999px;background:#27415d;position:relative;transition:background .15s;flex:none}',
      '.asc-track:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s}',
      '.asc-switch input:checked+.asc-track{background:#2a9d6a}',
      '.asc-switch input:checked+.asc-track:after{left:21px}',
      '.asc-switch input:focus-visible+.asc-track{outline:2px solid #77c8ff;outline-offset:2px}',
      '.asc-form{border:1px solid #3d8fd0;background:#0c1a2c;border-radius:18px;padding:20px;margin-bottom:16px}',
      '.asc-form h3{margin:0 0 4px;font-family:Georgia,"Times New Roman",serif;font-size:23px}',
      '.asc-step{margin-top:16px}',
      '.asc-step>label,.asc-step>.asc-q{display:block;font-size:13px;font-weight:700;color:#fff;margin-bottom:7px}',
      '.asc-hint{font-size:12px;color:#91a4ba;font-weight:400}',
      '.asc-pick{display:flex;gap:8px;flex-wrap:wrap}',
      '.asc-pick button{padding:12px 18px;border-radius:12px;border:1px solid #27415d;background:#07111f;color:#b9c8d8;font-size:14px;font-weight:700;cursor:pointer}',
      '.asc-pick button.on{background:#155e9b;border-color:#77c8ff;color:#fff}',
      '.asc-states{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
      '.asc-state{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;border:1px solid #27415d;background:#07111f;font-size:13px;color:#b9c8d8;cursor:pointer}',
      '.asc-state.on{border-color:#2a9d6a;color:#fff;background:#0e2a22}',
      '.asc-state input{accent-color:#2a9d6a;width:16px;height:16px;flex:none}',
      '.asc-err{margin-top:12px;padding:10px 12px;border-radius:10px;background:#3a1620;color:#ffc2cc;font-size:13px}',
      '.asc-danger{border-color:#7a3340!important;color:#ffb4bf!important}',
      'textarea.mini-input{min-height:74px;resize:vertical;font-family:inherit}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- data ---------- */
  async function loadAll() {
    var c = sb();
    if (!c) throw new Error('Not connected to Supabase. Sign in again.');
    var r = await Promise.all([
      c.from('catalog_license_types').select('id,name,short_name,sort_order').order('sort_order'),
      c.from('catalog_pillars').select('id,name,license_type_id,sort_order').order('sort_order'),
      c.from('catalog_states').select('code,name,is_active').order('name'),
      c.from('catalog_carriers').select('id,name,website,access_through,notes,is_active,show_to_agents').order('name'),
      c.from('catalog_programs').select('id,name,pillar_id,carrier_id,description,is_active,show_to_agents,catalog_program_states(state_code)').order('name')
    ]);
    for (var i = 0; i < r.length; i++) if (r[i].error) throw r[i].error;
    state.licenses = r[0].data || [];
    state.pillars = r[1].data || [];
    state.states = r[2].data || [];
    state.carriers = r[3].data || [];
    state.programs = (r[4].data || []).map(function (p) {
      p.states = (p.catalog_program_states || []).map(function (x) { return x.state_code; }).sort();
      return p;
    });
  }
  function licenseFor(pillar) { var l = state.licenses.find(function (x) { return x.id === pillar.license_type_id; }); return l ? l.name : 'License not set'; }
  function carrierById(id) { return state.carriers.find(function (x) { return x.id === id; }) || null; }
  function activeStates() { return state.states.filter(function (s) { return s.is_active; }); }

  /* ---------- shared pieces ---------- */
  function switchHtml(kind, id, on, label) {
    return '<label class="asc-switch"><input type="checkbox" data-asc="toggle" data-kind="' + kind + '" data-id="' + esc(id) + '"' + (on ? ' checked' : '') + '><span class="asc-track"></span><span>' + esc(label) + '</span></label>';
  }
  function stateChips(codes) {
    if (!codes.length) return '<span class="asc-chip off">No states picked</span>';
    return codes.map(function (c) { return '<span class="asc-chip">' + esc(c) + '</span>'; }).join('');
  }

  /* ---------- manage view (owner + admin) ---------- */
  function manageShell() {
    return '<div class="dashboard-head"><div><div class="kicker">CARRIERS &amp; PROGRAMS</div><h2>What Allshield offers.</h2>' +
      '<p>Add a carrier or program here once. It shows up for agents and for Ava, the Academy tutor, when you switch it on.</p></div></div>' +
      '<div id="ascBody"><div class="bo-card">Loading…</div></div>';
  }
  function renderManage() {
    var body = document.getElementById('ascBody');
    if (!body) return;
    var tabs = [['programs', 'Programs'], ['carriers', 'Carriers'], ['states', 'States']];
    var html = '<div class="asc-tabs">' + tabs.map(function (t) {
      return '<button type="button" class="asc-tab' + (state.tab === t[0] ? ' on' : '') + '" data-asc="tab" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    if (state.form) html += formHtml();
    if (state.tab === 'programs') html += programsHtml();
    if (state.tab === 'carriers') html += carriersHtml();
    if (state.tab === 'states') html += statesHtml();
    body.innerHTML = html;
  }

  function programsHtml() {
    var html = '<div class="asc-bar"><p>Programs are the products agents sell, grouped by pillar.</p>' +
      '<button type="button" class="btn btn-primary" data-asc="new-program">+ Add Program</button></div>';
    state.pillars.forEach(function (pl) {
      var rows = state.programs.filter(function (p) { return p.pillar_id === pl.id && p.is_active; });
      html += '<div class="asc-pillar"><h3>' + esc(pl.name) + '</h3><div class="asc-lic">License needed: ' + esc(licenseFor(pl)) + '</div>';
      if (!rows.length) html += '<div class="asc-empty">Nothing here yet.</div>';
      rows.forEach(function (p) {
        var c = carrierById(p.carrier_id);
        html += '<div class="asc-row"><div class="asc-row-main"><div class="asc-name">' + esc(p.name) + '</div>' +
          '<div class="asc-sub">Carrier: ' + esc(c ? c.name : 'None yet') + '</div><div>' + stateChips(p.states) + '</div></div>' +
          '<div class="asc-actions">' + switchHtml('program', p.id, p.show_to_agents, 'Show to agents') +
          '<button type="button" class="tiny-btn" data-asc="edit-program" data-id="' + esc(p.id) + '">Edit</button>' +
          '<button type="button" class="tiny-btn asc-danger" data-asc="remove" data-kind="program" data-id="' + esc(p.id) + '">Remove</button></div></div>';
      });
      html += '</div>';
    });
    return html;
  }

  function carriersHtml() {
    var rows = state.carriers.filter(function (c) { return c.is_active; });
    var html = '<div class="asc-bar"><p>Carriers are the insurance companies Allshield is contracted with. Ava will only name carriers switched on here.</p>' +
      '<button type="button" class="btn btn-primary" data-asc="new-carrier">+ Add Carrier</button></div><div class="asc-pillar">';
    if (!rows.length) html += '<div class="asc-empty">No carriers yet. Press “+ Add Carrier” to add your first one.</div>';
    rows.forEach(function (c) {
      var used = state.programs.filter(function (p) { return p.carrier_id === c.id && p.is_active; }).map(function (p) { return p.name; });
      html += '<div class="asc-row"><div class="asc-row-main"><div class="asc-name">' + esc(c.name) + '</div>' +
        '<div class="asc-sub">Through: ' + esc(c.access_through || 'Direct contract') + (c.website ? ' • ' + esc(c.website) : '') + '</div>' +
        '<div class="asc-sub">Programs: ' + esc(used.length ? used.join(', ') : 'None yet') + '</div></div>' +
        '<div class="asc-actions">' + switchHtml('carrier', c.id, c.show_to_agents, 'Show to agents') +
        '<button type="button" class="tiny-btn" data-asc="edit-carrier" data-id="' + esc(c.id) + '">Edit</button>' +
        '<button type="button" class="tiny-btn asc-danger" data-asc="remove" data-kind="carrier" data-id="' + esc(c.id) + '">Remove</button></div></div>';
    });
    return html + '</div>';
  }

  function statesHtml() {
    var on = activeStates().length;
    var html = '<div class="asc-bar"><p>Tick every state Allshield works in. Only ticked states can be picked on a program. (' + on + ' on)</p></div><div class="asc-pillar"><div class="asc-states">';
    state.states.forEach(function (s) {
      html += '<label class="asc-state' + (s.is_active ? ' on' : '') + '"><input type="checkbox" data-asc="state-active" data-code="' + esc(s.code) + '"' + (s.is_active ? ' checked' : '') + '>' + esc(s.name) + '</label>';
    });
    return html + '</div></div>';
  }

  /* ---------- forms ---------- */
  function formHtml() {
    var f = state.form, d = f.data, html = '';
    if (f.kind === 'carrier') {
      var known = ACCESS_OPTIONS.indexOf(d.access_through) >= 0 && d.access_through !== 'Other';
      html += '<div class="asc-form"><h3>' + (d.id ? 'Edit carrier' : 'Add a carrier') + '</h3>' +
        '<div class="asc-step"><label for="ascName">1. Carrier name</label><input id="ascName" class="mini-input" maxlength="120" placeholder="Example: Allstate" value="' + esc(d.name) + '"></div>' +
        '<div class="asc-step"><span class="asc-q">2. How does Allshield get this carrier?</span><div class="asc-pick">' +
        ACCESS_OPTIONS.map(function (o) {
          var isOn = o === 'Other' ? !known : d.access_through === o;
          return '<button type="button" class="' + (isOn ? 'on' : '') + '" data-asc="pick-access" data-val="' + esc(o) + '">' + esc(o) + '</button>';
        }).join('') + '</div>' +
        (known ? '' : '<input id="ascAccessOther" class="mini-input" style="margin-top:8px" maxlength="120" placeholder="Type where this carrier comes from" value="' + esc(d.access_through === 'Other' ? '' : d.access_through) + '">') + '</div>' +
        '<div class="asc-step"><label for="ascWebsite">3. Website <span class="asc-hint">(optional)</span></label><input id="ascWebsite" class="mini-input" maxlength="200" placeholder="allstate.com" value="' + esc(d.website) + '"></div>' +
        '<div class="asc-step"><label for="ascNotes">4. Notes for you and admins <span class="asc-hint">(optional, agents never see this)</span></label><textarea id="ascNotes" class="mini-input" maxlength="1000">' + esc(d.notes) + '</textarea></div>';
    } else {
      html += '<div class="asc-form"><h3>' + (d.id ? 'Edit program' : 'Add a program') + '</h3>' +
        '<div class="asc-step"><span class="asc-q">1. Which pillar is it?</span><div class="asc-pick">' +
        state.pillars.map(function (pl) {
          return '<button type="button" class="' + (d.pillar_id === pl.id ? 'on' : '') + '" data-asc="pick-pillar" data-id="' + esc(pl.id) + '">' + esc(pl.name) + '</button>';
        }).join('') + '</div>' + pillarLicenseNote(d.pillar_id) + '</div>' +
        '<div class="asc-step"><label for="ascName">2. Program name</label><input id="ascName" class="mini-input" maxlength="120" placeholder="Example: Dental" value="' + esc(d.name) + '"></div>' +
        '<div class="asc-step"><label for="ascCarrier">3. Which carrier?</label><select id="ascCarrier" class="mini-input"><option value="">No carrier yet</option>' +
        state.carriers.filter(function (c) { return c.is_active; }).map(function (c) {
          return '<option value="' + esc(c.id) + '"' + (d.carrier_id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
        }).join('') + '</select><div class="asc-hint" style="margin-top:6px">Carrier not in the list? Save this, then add it on the Carriers tab.</div></div>' +
        '<div class="asc-step"><span class="asc-q">4. Which states? <span class="asc-hint">(only states switched on in the States tab)</span></span>' +
        '<div class="row-actions" style="margin:0 0 8px"><button type="button" class="tiny-btn" data-asc="states-all">Select all</button><button type="button" class="tiny-btn" data-asc="states-none">Clear</button></div><div class="asc-states">' +
        activeStates().map(function (s) {
          var isOn = d.states.indexOf(s.code) >= 0;
          return '<label class="asc-state' + (isOn ? ' on' : '') + '"><input type="checkbox" data-asc="form-state" data-code="' + esc(s.code) + '"' + (isOn ? ' checked' : '') + '>' + esc(s.name) + '</label>';
        }).join('') + '</div></div>' +
        '<div class="asc-step"><label for="ascDesc">5. Short description <span class="asc-hint">(optional — agents and Ava can see this)</span></label><textarea id="ascDesc" class="mini-input" maxlength="1000">' + esc(d.description) + '</textarea></div>';
    }
    html += '<div class="asc-step"><label class="asc-switch"><input type="checkbox" id="ascShow"' + (d.show_to_agents ? ' checked' : '') + '><span class="asc-track"></span><span>Show to agents and Ava</span></label></div>' +
      (f.error ? '<div class="asc-err">' + esc(f.error) + '</div>' : '') +
      '<div class="row-actions"><button type="button" class="btn btn-primary" data-asc="save"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Saving…' : 'Save') + '</button>' +
      '<button type="button" class="tiny-btn" data-asc="cancel">Cancel</button></div></div>';
    return html;
  }
  function pillarLicenseNote(pillarId) {
    var pl = state.pillars.find(function (x) { return x.id === pillarId; });
    return pl ? '<div class="asc-hint" style="margin-top:8px">License needed to sell this: ' + esc(licenseFor(pl)) + '</div>' : '';
  }
  /* copy what is typed into the form state so a re-render never loses it */
  function readForm() {
    var f = state.form; if (!f) return;
    var d = f.data, el;
    if ((el = document.getElementById('ascName'))) d.name = el.value;
    if ((el = document.getElementById('ascShow'))) d.show_to_agents = el.checked;
    if (f.kind === 'carrier') {
      if ((el = document.getElementById('ascWebsite'))) d.website = el.value;
      if ((el = document.getElementById('ascNotes'))) d.notes = el.value;
      if ((el = document.getElementById('ascAccessOther'))) d.access_through = el.value.trim() || 'Other';
    } else {
      if ((el = document.getElementById('ascCarrier'))) d.carrier_id = el.value || null;
      if ((el = document.getElementById('ascDesc'))) d.description = el.value;
    }
  }
  function openForm(kind, row) {
    var d;
    if (kind === 'carrier') d = row ? { id: row.id, name: row.name, website: row.website || '', access_through: row.access_through || 'Direct contract', notes: row.notes || '', show_to_agents: !!row.show_to_agents }
      : { id: null, name: '', website: '', access_through: 'Direct contract', notes: '', show_to_agents: false };
    else d = row ? { id: row.id, name: row.name, pillar_id: row.pillar_id, carrier_id: row.carrier_id, description: row.description || '', states: row.states.slice(), show_to_agents: !!row.show_to_agents }
      : { id: null, name: '', pillar_id: null, carrier_id: null, description: '', states: [], show_to_agents: false };
    state.form = { kind: kind, data: d, error: '' };
    state.tab = kind === 'carrier' ? 'carriers' : 'programs';
    renderManage();
    var n = document.getElementById('ascName'); if (n) { n.focus(); }
    var fm = document.querySelector('.asc-form'); if (fm && fm.scrollIntoView) fm.scrollIntoView({ block: 'start' });
  }

  async function save() {
    readForm();
    var f = state.form, d = f.data, c = sb();
    var name = String(d.name || '').trim();
    if (!name) { f.error = 'Type a name first.'; return renderManage(); }
    if (f.kind === 'program' && !d.pillar_id) { f.error = 'Pick a pillar first (Life, Health, Home or Auto).'; return renderManage(); }
    if (f.kind === 'carrier') {
      var clash = state.carriers.find(function (x) { return x.name.trim().toLowerCase() === name.toLowerCase() && x.id !== d.id; });
      if (clash) { f.error = clash.is_active ? 'That carrier is already in your list.' : 'That carrier was removed before. Saving will bring it back.'; if (clash.is_active) return renderManage(); d.id = clash.id; }
    }
    state.busy = true; f.error = ''; renderManage();
    try {
      var now = new Date().toISOString();
      if (f.kind === 'carrier') {
        var access = String(d.access_through || '').trim(); if (!access || access === 'Other') access = 'Other';
        var crow = { name: name, website: String(d.website || '').trim() || null, access_through: access, notes: String(d.notes || '').trim() || null, show_to_agents: !!d.show_to_agents, is_active: true, updated_at: now };
        var cres = d.id ? await c.from('catalog_carriers').update(crow).eq('id', d.id).select('id') : await c.from('catalog_carriers').insert(crow).select('id');
        if (cres.error) throw cres.error;
        if (!cres.data || !cres.data.length) throw new Error('Not saved. Only owner and admin accounts can change the catalog.');
      } else {
        var prow = { name: name, pillar_id: d.pillar_id, carrier_id: d.carrier_id || null, description: String(d.description || '').trim() || null, show_to_agents: !!d.show_to_agents, is_active: true, updated_at: now };
        var pres = d.id ? await c.from('catalog_programs').update(prow).eq('id', d.id).select('id') : await c.from('catalog_programs').insert(prow).select('id');
        if (pres.error) throw pres.error;
        if (!pres.data || !pres.data.length) throw new Error('Not saved. Only owner and admin accounts can change the catalog.');
        var pid = pres.data[0].id;
        var del = await c.from('catalog_program_states').delete().eq('program_id', pid);
        if (del.error) throw del.error;
        if (d.states.length) {
          var ins = await c.from('catalog_program_states').insert(d.states.map(function (code) { return { program_id: pid, state_code: code }; }));
          if (ins.error) throw ins.error;
        }
      }
      state.form = null; state.busy = false;
      await loadAll(); renderManage(); say('Saved.');
    } catch (e) {
      state.busy = false;
      if (state.form) state.form.error = 'Could not save: ' + (e.message || e);
      renderManage();
    }
  }

  async function toggleShow(kind, id, on, input) {
    var table = kind === 'carrier' ? 'catalog_carriers' : 'catalog_programs';
    try {
      var r = await sb().from(table).update({ show_to_agents: on, updated_at: new Date().toISOString() }).eq('id', id).select('id');
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('Only owner and admin accounts can change the catalog.');
      var list = kind === 'carrier' ? state.carriers : state.programs;
      var row = list.find(function (x) { return x.id === id; }); if (row) row.show_to_agents = on;
      say(on ? 'Now showing to agents.' : 'Hidden from agents.');
    } catch (e) { if (input) input.checked = !on; alert('Could not change it: ' + (e.message || e)); }
  }
  async function toggleState(code, on, input) {
    try {
      var r = await sb().from('catalog_states').update({ is_active: on, updated_at: new Date().toISOString() }).eq('code', code).select('code');
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('Only owner and admin accounts can change the catalog.');
      var row = state.states.find(function (x) { return x.code === code; }); if (row) row.is_active = on;
      renderManage();
    } catch (e) { if (input) input.checked = !on; alert('Could not change it: ' + (e.message || e)); }
  }
  /* "Remove" hides the item everywhere but keeps the record, so nothing is lost. */
  async function removeItem(kind, id) {
    var list = kind === 'carrier' ? state.carriers : state.programs;
    var row = list.find(function (x) { return x.id === id; }); if (!row) return;
    if (!window.confirm('Remove "' + row.name + '"? It will be hidden from agents and from Ava.')) return;
    try {
      var table = kind === 'carrier' ? 'catalog_carriers' : 'catalog_programs';
      var r = await sb().from(table).update({ is_active: false, show_to_agents: false, updated_at: new Date().toISOString() }).eq('id', id).select('id');
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('Only owner and admin accounts can change the catalog.');
      await loadAll(); renderManage(); say('Removed.');
    } catch (e) { alert('Could not remove it: ' + (e.message || e)); }
  }

  /* ---------- agent view (read-only) ---------- */
  function agentShell() {
    return '<div class="dashboard-head"><div><div class="kicker">CARRIERS &amp; PROGRAMS</div><h2>What you can offer.</h2>' +
      '<p>The programs and carriers Allshield currently works with. New ones appear here when the office adds them.</p></div></div>' +
      '<div id="ascAgentBody"><div class="bo-card">Loading…</div></div>';
  }
  function renderAgent() {
    var body = document.getElementById('ascAgentBody'); if (!body) return;
    var html = '';
    state.pillars.forEach(function (pl) {
      var rows = state.programs.filter(function (p) { return p.pillar_id === pl.id; });
      if (!rows.length) return;
      html += '<div class="asc-pillar"><h3>' + esc(pl.name) + '</h3><div class="asc-lic">License needed: ' + esc(licenseFor(pl)) + '</div>';
      rows.forEach(function (p) {
        var c = carrierById(p.carrier_id);
        html += '<div class="asc-row"><div class="asc-row-main"><div class="asc-name">' + esc(p.name) + '</div>' +
          (c ? '<div class="asc-sub">Carrier: ' + esc(c.name) + '</div>' : '') +
          (p.description ? '<div class="asc-sub">' + esc(p.description) + '</div>' : '') +
          '<div>' + stateChips(p.states) + '</div></div></div>';
      });
      html += '</div>';
    });
    body.innerHTML = html || '<div class="bo-card">No programs are listed yet. Check back soon.</div>';
  }

  /* ---------- open a view ---------- */
  async function open(portal) {
    state.portal = portal; state.form = null; state.busy = false;
    var h = host(portal); if (!h) return;
    addStyles();
    var manage = portal !== 'agent';
    h.innerHTML = manage ? manageShell() : agentShell();
    try { await loadAll(); manage ? renderManage() : renderAgent(); }
    catch (e) {
      var b = document.getElementById(manage ? 'ascBody' : 'ascAgentBody');
      if (b) b.innerHTML = '<div class="bo-card"><h3>Could not load</h3><p>' + esc(e.message || e) + '</p><div class="row-actions"><button type="button" class="tiny-btn" data-asc="retry">Try again</button></div></div>';
    }
  }

  /* ---------- clicks ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target.closest('[data-asc]') : null; if (!t) return;
    var a = t.getAttribute('data-asc'), f = state.form;
    if (a === 'open') { var p = t.getAttribute('data-portal'); t.parentElement.querySelectorAll('.side-link').forEach(function (x) { x.classList.remove('active'); }); t.classList.add('active'); return void open(p); }
    if (a === 'retry') return void open(state.portal);
    if (a === 'tab') { readForm(); state.tab = t.getAttribute('data-tab'); state.form = null; return renderManage(); }
    if (a === 'new-program') return openForm('program', null);
    if (a === 'new-carrier') return openForm('carrier', null);
    if (a === 'edit-program') return openForm('program', state.programs.find(function (x) { return x.id === t.getAttribute('data-id'); }));
    if (a === 'edit-carrier') return openForm('carrier', state.carriers.find(function (x) { return x.id === t.getAttribute('data-id'); }));
    if (a === 'remove') return void removeItem(t.getAttribute('data-kind'), t.getAttribute('data-id'));
    if (a === 'cancel') { state.form = null; return renderManage(); }
    if (a === 'save') { if (!state.busy) save(); return; }
    if (!f) return;
    if (a === 'pick-pillar') { readForm(); f.data.pillar_id = t.getAttribute('data-id'); f.error = ''; return renderManage(); }
    if (a === 'pick-access') { readForm(); f.data.access_through = t.getAttribute('data-val'); return renderManage(); }
    if (a === 'states-all') { readForm(); f.data.states = activeStates().map(function (s) { return s.code; }); return renderManage(); }
    if (a === 'states-none') { readForm(); f.data.states = []; return renderManage(); }
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target; if (!t || !t.getAttribute) return;
    var a = t.getAttribute('data-asc');
    if (a === 'toggle') return void toggleShow(t.getAttribute('data-kind'), t.getAttribute('data-id'), t.checked, t);
    if (a === 'state-active') return void toggleState(t.getAttribute('data-code'), t.checked, t);
    if (a === 'form-state' && state.form) {
      var code = t.getAttribute('data-code'), list = state.form.data.states, i = list.indexOf(code);
      if (t.checked && i < 0) list.push(code); if (!t.checked && i >= 0) list.splice(i, 1);
      list.sort(); if (t.parentElement) t.parentElement.classList.toggle('on', t.checked);
    }
  });

  /* ---------- sidebar links ---------- */
  function addLink(portal, label) {
    var bar = document.querySelector('#' + portal + 'Portal .sidebar');
    if (!bar || bar.querySelector('[data-asc="open"]')) return;
    var link = document.createElement('div');
    link.className = 'side-link';
    link.setAttribute('data-asc', 'open');
    link.setAttribute('data-portal', portal);
    link.setAttribute('role', 'button');
    link.setAttribute('tabindex', '0');
    link.textContent = '▤ ' + label;
    link.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); link.click(); } });
    var links = bar.querySelectorAll('.side-link');
    var after = null;
    links.forEach(function (x) { if (/'states'|'licensing'/.test(x.getAttribute('onclick') || '')) after = x; });
    if (after && after.parentElement) after.parentElement.insertBefore(link, after.nextSibling);
    else if (links.length) links[links.length - 1].parentElement.appendChild(link);
    else bar.appendChild(link);
  }
  function boot() {
    addStyles();
    addLink('owner', 'Carriers & Programs');
    addLink('admin', 'Carriers & Programs');
    addLink('agent', 'Carriers & Programs');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', boot);
  window.allshieldCatalog = { open: open };
})();
