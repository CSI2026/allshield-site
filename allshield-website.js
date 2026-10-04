/* Allshield — Website controls
   1. Site Photos (Owner only): a photo library, plus a list of every photo spot on the public
      site so the owner can choose which library photo shows in each spot.
   2. Homepage Pop-up (Owner + Admin): create pop-ups (ad, agent spotlight, giveaway,
      announcement), switch one on or off, optionally schedule it.
   3. Public side: shows the pop-up that is switched on, and fills any element marked
      data-photo-slot="..." with the photo chosen for that spot.
   Data: Supabase tables site_photos, site_photo_slots, site_popups and storage bucket site-photos. */
(function () {
  'use strict';

  var KINDS = [['ad', 'Ad'], ['agent', 'Agent spotlight'], ['giveaway', 'Giveaway'], ['announcement', 'Announcement']];
  var FREQ = [['once_per_day', 'Once a day per visitor'], ['once', 'Only once per visitor'], ['every_visit', 'Every visit']];
  var BUCKET = 'site-photos', MAX_BYTES = 5 * 1024 * 1024;
  var st = { portal: 'owner', screen: 'photos', tab: 'spots', photos: [], slots: [], popups: [], picker: null, form: null, filter: '', busy: false, msg: '' };

  function sb() { return window.allshieldSupabase || null; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function say(m) { if (typeof window.toast === 'function') { try { window.toast(m); } catch (e) { } } }
  function safeImg(u) { return /^https:\/\//i.test(String(u || '')) ? String(u) : ''; }
  function safeLink(u) { u = String(u || '').trim(); return /^(https:\/\/|\/|#)/i.test(u) ? u : ''; }
  function photoById(id) { return st.photos.find(function (p) { return p.id === id; }) || null; }
  function host() { return document.getElementById(st.portal + 'Main'); }
  function need(r) { if (r.error) throw r.error; return r.data || []; }
  function wrote(r, who) { if (r.error) throw r.error; if (!r.data || !r.data.length) throw new Error('Not saved. Only ' + who + ' accounts can change this.'); return r.data; }

  function addStyles() {
    if (document.getElementById('asWebStyles')) return;
    var s = document.createElement('style'); s.id = 'asWebStyles';
    s.textContent = [
      '.asw-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}',
      '.asw-tab{padding:11px 18px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#0c1a2c;color:#b9c8d8;font-size:14px;font-weight:700;cursor:pointer}',
      '.asw-tab.on{background:#10223a;color:#fff;border-color:#3d8fd0}',
      '.asw-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}.asw-bar p{margin:0;color:#91a4ba;font-size:13px}',
      '.asw-card{border:1px solid rgba(255,255,255,.09);background:#0c1a2c;border-radius:18px;padding:18px 20px;margin-bottom:14px}',
      '.asw-card h3{margin:0 0 12px;font-family:Georgia,"Times New Roman",serif;font-size:22px}',
      '.asw-row{display:flex;align-items:center;gap:14px;padding:12px 0;border-top:1px solid rgba(255,255,255,.07);flex-wrap:wrap}',
      '.asw-thumb{width:110px;height:74px;border-radius:10px;object-fit:cover;background:#102b46;flex:none;display:block}',
      '.asw-main{flex:1 1 220px;min-width:0}.asw-name{font-size:15px;font-weight:700;color:#fff}.asw-sub{font-size:12px;color:#91a4ba;margin-top:3px;overflow-wrap:anywhere}',
      '.asw-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.asw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}',
      '.asw-ph{border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;background:#07111f;text-align:left;padding:0;color:#e8f0f8;font:inherit}',
      'button.asw-ph{cursor:pointer}button.asw-ph:hover,button.asw-ph.on{border-color:#77c8ff;box-shadow:0 0 0 2px #237fc7}',
      '.asw-ph img{width:100%;height:120px;object-fit:cover;display:block;background:#102b46}',
      '.asw-ph div{padding:9px 10px;font-size:12px;line-height:1.35}.asw-ph small{display:block;color:#7bcaff;font-size:11px;margin-top:3px}',
      '.asw-ph .asw-actions{padding:0 10px 10px}',
      '.asw-form{border:1px solid #3d8fd0;background:#0c1a2c;border-radius:18px;padding:20px;margin-bottom:16px}',
      '.asw-form h3{margin:0 0 4px;font-family:Georgia,"Times New Roman",serif;font-size:23px}',
      '.asw-step{margin-top:16px}.asw-step>label,.asw-q{display:block;font-size:13px;font-weight:700;color:#fff;margin-bottom:7px}',
      '.asw-hint{font-size:12px;color:#91a4ba;font-weight:400}',
      '.asw-pick{display:flex;gap:8px;flex-wrap:wrap}.asw-pick button{padding:11px 16px;border-radius:12px;border:1px solid #27415d;background:#07111f;color:#b9c8d8;font-size:14px;font-weight:700;cursor:pointer}.asw-pick button.on{background:#155e9b;border-color:#77c8ff;color:#fff}',
      '.asw-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '.asw-err{margin-top:12px;padding:10px 12px;border-radius:10px;background:#3a1620;color:#ffc2cc;font-size:13px}',
      '.asw-danger{border-color:#7a3340!important;color:#ffb4bf!important}',
      '.asw-live{display:inline-block;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:800;background:#0e2a22;color:#8ee0b8}.asw-off{background:#2a2230;color:#d8a9b4}',
      '.asw-switch{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:#b9c8d8;cursor:pointer;user-select:none}.asw-switch input{position:absolute;opacity:0;width:0;height:0}',
      '.asw-track{width:42px;height:24px;border-radius:999px;background:#27415d;position:relative;flex:none}.asw-track:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s}',
      '.asw-switch input:checked+.asw-track{background:#2a9d6a}.asw-switch input:checked+.asw-track:after{left:21px}.asw-switch input:focus-visible+.asw-track{outline:2px solid #77c8ff;outline-offset:2px}',
      'textarea.mini-input{min-height:74px;resize:vertical;font-family:inherit}',
      '.asw-pop-shade{position:fixed;inset:0;background:rgba(2,6,12,.78);z-index:9998;display:flex;align-items:center;justify-content:center;padding:18px}',
      '.asw-pop{background:#fff;color:#0a1830;border-radius:24px;max-width:460px;width:100%;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.6);position:relative;font-family:Arial,Helvetica,sans-serif;max-height:92vh;overflow-y:auto}',
      '.asw-pop img{width:100%;height:220px;object-fit:cover;display:block}',
      '.asw-pop-body{padding:24px}.asw-pop-kind{font-size:11px;letter-spacing:.22em;font-weight:800;color:#1d78c8;margin-bottom:8px}',
      '.asw-pop h3{font-family:Georgia,"Times New Roman",serif;font-size:27px;line-height:1.15;margin:0 0 10px;color:#0a1830}',
      '.asw-pop p{color:#48607c;font-size:15px;line-height:1.55;margin:0 0 18px;white-space:pre-line}',
      '.asw-pop-btn{display:inline-block;padding:14px 22px;border-radius:999px;background:linear-gradient(135deg,#77c8ff,#237fc7 52%,#155e9b);color:#04121f;font-weight:800;font-size:15px;text-decoration:none}',
      '.asw-pop-x{position:absolute;top:12px;right:12px;width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:#0a1830;font-size:18px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3)}',
      '@media(max-width:600px){.asw-two{grid-template-columns:1fr}.asw-pop img{height:170px}.asw-pop h3{font-size:23px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------------- data ---------------- */
  async function loadPhotos() {
    var c = sb(); if (!c) throw new Error('Not connected to Supabase. Sign in again.');
    var r = await Promise.all([
      c.from('site_photos').select('id,url,label,tag,source,storage_path,created_at').order('created_at', { ascending: false }),
      c.from('site_photo_slots').select('slot_key,page,section,sort_order,photo_id,default_photo_id').order('sort_order')
    ]);
    st.photos = need(r[0]); st.slots = need(r[1]);
  }
  async function loadPopups() {
    var c = sb(); if (!c) throw new Error('Not connected to Supabase. Sign in again.');
    var r = await Promise.all([
      c.from('site_popups').select('id,name,kind,headline,body,photo_id,button_label,button_url,is_on,starts_at,ends_at,frequency,updated_at').order('updated_at', { ascending: false }),
      c.from('site_photos').select('id,url,label,tag,source,storage_path,created_at').order('created_at', { ascending: false })
    ]);
    st.popups = need(r[0]); st.photos = need(r[1]);
  }
  function tags() { var t = []; st.photos.forEach(function (p) { if (p.tag && t.indexOf(p.tag) < 0) t.push(p.tag); }); return t.sort(); }

  /* ---------------- photo picker (shared) ---------------- */
  function pickerHtml(title, current) {
    var list = st.photos.filter(function (p) { return !st.filter || p.tag === st.filter; });
    return '<div class="asw-form"><h3>' + esc(title) + '</h3><div class="asw-hint">Click a photo to choose it.</div>' +
      '<div class="asw-pick" style="margin:14px 0"><button type="button" class="' + (!st.filter ? 'on' : '') + '" data-asw="filter" data-tag="">All</button>' +
      tags().map(function (t) { return '<button type="button" class="' + (st.filter === t ? 'on' : '') + '" data-asw="filter" data-tag="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
      '<div class="asw-grid">' + (list.length ? list.map(function (p) {
        return '<button type="button" class="asw-ph' + (p.id === current ? ' on' : '') + '" data-asw="choose" data-id="' + esc(p.id) + '"><img src="' + esc(safeImg(p.url)) + '" alt="" loading="lazy"><div>' + esc(p.label) + (p.tag ? '<small>' + esc(p.tag) + '</small>' : '') + '</div></button>';
      }).join('') : '<div class="asw-hint">No photos here yet.</div>') + '</div>' +
      '<div class="row-actions"><button type="button" class="tiny-btn" data-asw="picker-cancel">Cancel</button></div></div>';
  }

  /* ---------------- Site Photos screen (owner) ---------------- */
  function photosShell() {
    return '<div class="dashboard-head"><div><div class="kicker">SITE PHOTOS</div><h2>The photos on your website.</h2><p>Keep a library of photos, and choose which one shows in each spot on the public site. Changes show on the site right away.</p></div></div><div id="aswBody"><div class="bo-card">Loading…</div></div>';
  }
  function renderPhotos() {
    var b = document.getElementById('aswBody'); if (!b) return;
    var h = '<div class="asw-tabs"><button type="button" class="asw-tab' + (st.tab === 'spots' ? ' on' : '') + '" data-asw="tab" data-tab="spots">Where photos go</button><button type="button" class="asw-tab' + (st.tab === 'library' ? ' on' : '') + '" data-asw="tab" data-tab="library">Photo library (' + st.photos.length + ')</button></div>';
    if (st.picker && st.picker.kind === 'slot') {
      var sl = st.slots.find(function (x) { return x.slot_key === st.picker.key; });
      h += pickerHtml('Choose a photo for: ' + (sl ? sl.page + ' — ' + sl.section : ''), sl ? sl.photo_id : null);
    }
    if (st.form && st.form.kind === 'photo') h += photoFormHtml();
    h += st.tab === 'spots' ? spotsHtml() : libraryHtml();
    b.innerHTML = h;
  }
  function spotsHtml() {
    var pages = []; st.slots.forEach(function (s) { if (pages.indexOf(s.page) < 0) pages.push(s.page); });
    var h = '<div class="asw-bar"><p>Every photo spot on the public site, grouped by page.</p></div>';
    pages.forEach(function (pg) {
      h += '<div class="asw-card"><h3>' + esc(pg) + '</h3>';
      st.slots.filter(function (s) { return s.page === pg; }).forEach(function (s) {
        var p = photoById(s.photo_id), changed = s.default_photo_id && s.photo_id !== s.default_photo_id;
        h += '<div class="asw-row">' + (p ? '<img class="asw-thumb" src="' + esc(safeImg(p.url)) + '" alt="" loading="lazy">' : '<div class="asw-thumb"></div>') +
          '<div class="asw-main"><div class="asw-name">' + esc(s.section) + '</div><div class="asw-sub">' + esc(p ? p.label : 'No photo chosen. The site shows its built-in photo.') + '</div></div>' +
          '<div class="asw-actions"><button type="button" class="tiny-btn" data-asw="slot-change" data-key="' + esc(s.slot_key) + '">Change photo</button>' +
          (changed ? '<button type="button" class="tiny-btn" data-asw="slot-reset" data-key="' + esc(s.slot_key) + '">Use original</button>' : '') + '</div></div>';
      });
      h += '</div>';
    });
    return h;
  }
  function libraryHtml() {
    var list = st.photos.filter(function (p) { return !st.filter || p.tag === st.filter; });
    var h = '<div class="asw-bar"><p>All your photos. Add your own, or remove ones you no longer want.</p><button type="button" class="btn btn-primary" data-asw="photo-new">+ Add Photo</button></div>' +
      '<div class="asw-pick" style="margin-bottom:14px"><button type="button" class="' + (!st.filter ? 'on' : '') + '" data-asw="filter" data-tag="">All</button>' +
      tags().map(function (t) { return '<button type="button" class="' + (st.filter === t ? 'on' : '') + '" data-asw="filter" data-tag="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div><div class="asw-grid">';
    list.forEach(function (p) {
      var used = st.slots.filter(function (s) { return s.photo_id === p.id; }).length;
      h += '<div class="asw-ph"><img src="' + esc(safeImg(p.url)) + '" alt="" loading="lazy"><div>' + esc(p.label) + '<small>' + esc(p.tag || 'No group') + (used ? ' • used in ' + used + ' spot' + (used > 1 ? 's' : '') : '') + '</small></div>' +
        '<div class="asw-actions"><button type="button" class="tiny-btn asw-danger" data-asw="photo-delete" data-id="' + esc(p.id) + '">Delete</button></div></div>';
    });
    return h + '</div>';
  }
  function photoFormHtml() {
    var d = st.form.data;
    return '<div class="asw-form"><h3>Add a photo</h3>' +
      '<div class="asw-step"><span class="asw-q">1. Where is the photo?</span><div class="asw-pick"><button type="button" class="' + (d.mode === 'file' ? 'on' : '') + '" data-asw="photo-mode" data-mode="file">Upload from my computer</button><button type="button" class="' + (d.mode === 'url' ? 'on' : '') + '" data-asw="photo-mode" data-mode="url">Paste a web link</button></div>' +
      (d.mode === 'file' ? '<input id="aswFile" type="file" accept="image/jpeg,image/png,image/webp" class="mini-input" style="margin-top:10px"><div class="asw-hint" style="margin-top:6px">JPG, PNG or WebP, up to 5 MB.</div>'
        : '<input id="aswUrl" class="mini-input" style="margin-top:10px" maxlength="600" placeholder="https://…" value="' + esc(d.url) + '">') + '</div>' +
      '<div class="asw-step"><label for="aswLabel">2. Describe it in a few words</label><input id="aswLabel" class="mini-input" maxlength="120" placeholder="Example: Our team at the fall kickoff" value="' + esc(d.label) + '"></div>' +
      '<div class="asw-step"><label for="aswTag">3. Group <span class="asw-hint">(helps you find it later)</span></label><input id="aswTag" class="mini-input" maxlength="40" list="aswTags" placeholder="Careers, Health, Life, Home, Auto…" value="' + esc(d.tag) + '"><datalist id="aswTags">' + tags().map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></div>' +
      (st.form.error ? '<div class="asw-err">' + esc(st.form.error) + '</div>' : '') +
      '<div class="row-actions"><button type="button" class="btn btn-primary" data-asw="photo-save"' + (st.busy ? ' disabled' : '') + '>' + (st.busy ? 'Saving…' : 'Save Photo') + '</button><button type="button" class="tiny-btn" data-asw="form-cancel">Cancel</button></div></div>';
  }
  function readPhotoForm() {
    var d = st.form.data, el;
    if ((el = document.getElementById('aswLabel'))) d.label = el.value;
    if ((el = document.getElementById('aswTag'))) d.tag = el.value;
    if ((el = document.getElementById('aswUrl'))) d.url = el.value;
  }
  async function savePhoto() {
    readPhotoForm();
    var f = st.form, d = f.data, c = sb(), label = String(d.label || '').trim(), tag = String(d.tag || '').trim() || null;
    var fileEl = document.getElementById('aswFile'), file = fileEl && fileEl.files ? fileEl.files[0] : null;
    if (d.mode === 'file' && !file) { f.error = 'Choose a photo file first.'; return renderPhotos(); }
    if (d.mode === 'file' && !/^image\/(jpeg|png|webp)$/.test(file.type)) { f.error = 'That file is not a JPG, PNG or WebP photo.'; return renderPhotos(); }
    if (d.mode === 'file' && file.size > MAX_BYTES) { f.error = 'That photo is over 5 MB. Please use a smaller one.'; return renderPhotos(); }
    if (d.mode === 'url' && !safeImg(String(d.url || '').trim())) { f.error = 'Paste a full link that starts with https://'; return renderPhotos(); }
    if (!label) { f.error = 'Add a few words describing the photo.'; return renderPhotos(); }
    st.busy = true; f.error = ''; renderPhotos();
    try {
      var url = String(d.url || '').trim(), path = null;
      if (d.mode === 'file') {
        var ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        path = 'library/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        var up = await c.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;
        url = c.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
      wrote(await c.from('site_photos').insert({ url: url, label: label, tag: tag, source: d.mode === 'file' ? 'upload' : 'link', storage_path: path }).select('id'), 'the Owner');
      st.form = null; st.busy = false; st.tab = 'library';
      await loadPhotos(); renderPhotos(); say('Photo added.');
    } catch (e) { st.busy = false; if (st.form) st.form.error = 'Could not save: ' + (e.message || e); renderPhotos(); }
  }
  async function deletePhoto(id) {
    var p = photoById(id); if (!p) return;
    var used = st.slots.filter(function (s) { return s.photo_id === id; });
    var note = used.length ? '\n\nIt is showing in ' + used.length + ' spot' + (used.length > 1 ? 's' : '') + ' (' + used.map(function (s) { return s.page + ': ' + s.section; }).join('; ') + '). Those spots will go back to the site\'s built-in photo.' : '';
    if (!window.confirm('Delete "' + p.label + '" from your library?' + note)) return;
    try {
      var c = sb();
      wrote(await c.from('site_photos').delete().eq('id', id).select('id'), 'the Owner');
      if (p.storage_path) { try { await c.storage.from(BUCKET).remove([p.storage_path]); } catch (e) { } }
      await loadPhotos(); renderPhotos(); say('Photo deleted.');
    } catch (e) { alert('Could not delete it: ' + (e.message || e)); }
  }
  async function setSlot(key, photoId) {
    try {
      wrote(await sb().from('site_photo_slots').update({ photo_id: photoId, updated_at: new Date().toISOString() }).eq('slot_key', key).select('slot_key'), 'the Owner');
      var s = st.slots.find(function (x) { return x.slot_key === key; }); if (s) s.photo_id = photoId;
      st.picker = null; renderPhotos(); say('Photo changed.');
    } catch (e) { alert('Could not change it: ' + (e.message || e)); }
  }

  /* ---------------- Homepage Pop-up screen (owner + admin) ---------------- */
  function popupShell() {
    return '<div class="dashboard-head"><div><div class="kicker">HOMEPAGE POP-UP</div><h2>Put a message in front of every visitor.</h2><p>Run an ad, spotlight an agent or announce a giveaway. Switch it on when you want it showing, and off when you don\'t. Only one pop-up shows at a time.</p></div></div><div id="aswBody"><div class="bo-card">Loading…</div></div>';
  }
  function isLive(p) { var n = Date.now(); return p.is_on && (!p.starts_at || Date.parse(p.starts_at) <= n) && (!p.ends_at || Date.parse(p.ends_at) >= n); }
  function kindName(k) { var f = KINDS.find(function (x) { return x[0] === k; }); return f ? f[1] : 'Announcement'; }
  function renderPopups() {
    var b = document.getElementById('aswBody'); if (!b) return;
    var h = '';
    if (st.picker && st.picker.kind === 'popup') h += pickerHtml('Choose a photo for this pop-up', st.form ? st.form.data.photo_id : null);
    else if (st.form && st.form.kind === 'popup') h += popupFormHtml();
    h += '<div class="asw-bar"><p>' + (st.popups.some(isLive) ? 'A pop-up is showing on the site right now.' : 'No pop-up is showing on the site right now.') + '</p><button type="button" class="btn btn-primary" data-asw="popup-new">+ New Pop-up</button></div><div class="asw-card">';
    if (!st.popups.length) h += '<div class="asw-hint">No pop-ups yet. Press “+ New Pop-up” to create your first one.</div>';
    st.popups.forEach(function (p) {
      var ph = photoById(p.photo_id), live = isLive(p), wait = p.is_on && !live;
      h += '<div class="asw-row">' + (ph ? '<img class="asw-thumb" src="' + esc(safeImg(ph.url)) + '" alt="" loading="lazy">' : '<div class="asw-thumb"></div>') +
        '<div class="asw-main"><div class="asw-name">' + esc(p.name) + ' <span class="asw-live' + (live ? '' : ' asw-off') + '">' + (live ? 'SHOWING NOW' : wait ? 'ON, OUTSIDE ITS DATES' : 'OFF') + '</span></div>' +
        '<div class="asw-sub">' + esc(kindName(p.kind)) + ' • ' + esc(p.headline) + '</div></div>' +
        '<div class="asw-actions"><label class="asw-switch"><input type="checkbox" data-asw="popup-toggle" data-id="' + esc(p.id) + '"' + (p.is_on ? ' checked' : '') + '><span class="asw-track"></span><span>On</span></label>' +
        '<button type="button" class="tiny-btn" data-asw="popup-preview" data-id="' + esc(p.id) + '">Preview</button>' +
        '<button type="button" class="tiny-btn" data-asw="popup-edit" data-id="' + esc(p.id) + '">Edit</button>' +
        '<button type="button" class="tiny-btn asw-danger" data-asw="popup-delete" data-id="' + esc(p.id) + '">Delete</button></div></div>';
    });
    b.innerHTML = h + '</div>';
  }
  function toLocal(iso) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d)) return ''; var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function popupFormHtml() {
    var d = st.form.data, ph = photoById(d.photo_id);
    return '<div class="asw-form"><h3>' + (d.id ? 'Edit pop-up' : 'New pop-up') + '</h3>' +
      '<div class="asw-step"><span class="asw-q">1. What kind is it?</span><div class="asw-pick">' + KINDS.map(function (k) { return '<button type="button" class="' + (d.kind === k[0] ? 'on' : '') + '" data-asw="popup-kind" data-kind="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="asw-step"><label for="aswPName">2. Name it <span class="asw-hint">(only you see this)</span></label><input id="aswPName" class="mini-input" maxlength="80" placeholder="Example: October giveaway" value="' + esc(d.name) + '"></div>' +
      '<div class="asw-step"><label for="aswPHead">3. Headline</label><input id="aswPHead" class="mini-input" maxlength="90" placeholder="Example: Win a $100 gift card" value="' + esc(d.headline) + '"></div>' +
      '<div class="asw-step"><label for="aswPBody">4. Message <span class="asw-hint">(optional)</span></label><textarea id="aswPBody" class="mini-input" maxlength="400" placeholder="One or two short sentences.">' + esc(d.body) + '</textarea></div>' +
      '<div class="asw-step"><span class="asw-q">5. Photo <span class="asw-hint">(optional)</span></span><div class="asw-row" style="border:0;padding:0">' + (ph ? '<img class="asw-thumb" src="' + esc(safeImg(ph.url)) + '" alt="">' : '') +
      '<div class="asw-actions"><button type="button" class="tiny-btn" data-asw="popup-photo">' + (ph ? 'Change photo' : 'Choose a photo') + '</button>' + (ph ? '<button type="button" class="tiny-btn" data-asw="popup-nophoto">No photo</button>' : '') + '</div></div></div>' +
      '<div class="asw-step"><span class="asw-q">6. Button <span class="asw-hint">(optional)</span></span><div class="asw-two"><input id="aswPBtn" class="mini-input" maxlength="40" placeholder="Button words, e.g. Enter Now" value="' + esc(d.button_label) + '"><input id="aswPUrl" class="mini-input" maxlength="400" placeholder="Where it goes, e.g. https://…" value="' + esc(d.button_url) + '"></div></div>' +
      '<div class="asw-step"><span class="asw-q">7. Dates <span class="asw-hint">(optional — leave empty to control it only with the On switch)</span></span><div class="asw-two"><label class="asw-hint">Start showing<input id="aswPStart" type="datetime-local" class="mini-input" value="' + esc(toLocal(d.starts_at)) + '"></label><label class="asw-hint">Stop showing<input id="aswPEnd" type="datetime-local" class="mini-input" value="' + esc(toLocal(d.ends_at)) + '"></label></div></div>' +
      '<div class="asw-step"><span class="asw-q">8. How often should a visitor see it?</span><div class="asw-pick">' + FREQ.map(function (k) { return '<button type="button" class="' + (d.frequency === k[0] ? 'on' : '') + '" data-asw="popup-freq" data-freq="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div></div>' +
      (st.form.error ? '<div class="asw-err">' + esc(st.form.error) + '</div>' : '') +
      '<div class="row-actions"><button type="button" class="btn btn-primary" data-asw="popup-save"' + (st.busy ? ' disabled' : '') + '>' + (st.busy ? 'Saving…' : 'Save') + '</button><button type="button" class="tiny-btn" data-asw="popup-preview-form">Preview</button><button type="button" class="tiny-btn" data-asw="form-cancel">Cancel</button></div>' +
      '<div class="asw-hint" style="margin-top:10px">Saving does not switch it on. Use the On switch in the list when you are ready.</div></div>';
  }
  function readPopupForm() {
    if (!st.form || st.form.kind !== 'popup') return;
    var d = st.form.data, g = function (id) { var el = document.getElementById(id); return el ? el.value : null; }, v;
    if ((v = g('aswPName')) !== null) d.name = v;
    if ((v = g('aswPHead')) !== null) d.headline = v;
    if ((v = g('aswPBody')) !== null) d.body = v;
    if ((v = g('aswPBtn')) !== null) d.button_label = v;
    if ((v = g('aswPUrl')) !== null) d.button_url = v;
    if ((v = g('aswPStart')) !== null) d.starts_at = v ? new Date(v).toISOString() : null;
    if ((v = g('aswPEnd')) !== null) d.ends_at = v ? new Date(v).toISOString() : null;
  }
  function openPopupForm(p) {
    st.picker = null;
    st.form = { kind: 'popup', error: '', data: p ? { id: p.id, name: p.name, kind: p.kind, headline: p.headline, body: p.body || '', photo_id: p.photo_id, button_label: p.button_label || '', button_url: p.button_url || '', starts_at: p.starts_at, ends_at: p.ends_at, frequency: p.frequency }
      : { id: null, name: '', kind: 'announcement', headline: '', body: '', photo_id: null, button_label: '', button_url: '', starts_at: null, ends_at: null, frequency: 'once_per_day' } };
    renderPopups();
    var f = document.querySelector('.asw-form'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'start' });
  }
  async function savePopup() {
    readPopupForm();
    var f = st.form, d = f.data, name = String(d.name || '').trim(), head = String(d.headline || '').trim();
    var btn = String(d.button_label || '').trim(), url = String(d.button_url || '').trim();
    if (!name) { f.error = 'Give it a name so you can find it later.'; return renderPopups(); }
    if (!head) { f.error = 'Add a headline.'; return renderPopups(); }
    if (url && !safeLink(url)) { f.error = 'The button link must start with https://'; return renderPopups(); }
    if (btn && !url) { f.error = 'Add where the button should go, or clear the button words.'; return renderPopups(); }
    if (d.starts_at && d.ends_at && Date.parse(d.ends_at) <= Date.parse(d.starts_at)) { f.error = 'The stop date must be after the start date.'; return renderPopups(); }
    st.busy = true; f.error = ''; renderPopups();
    try {
      var row = { name: name, kind: d.kind, headline: head, body: String(d.body || '').trim() || null, photo_id: d.photo_id || null, button_label: btn || null, button_url: url || null, starts_at: d.starts_at || null, ends_at: d.ends_at || null, frequency: d.frequency, updated_at: new Date().toISOString() };
      var c = sb();
      wrote(d.id ? await c.from('site_popups').update(row).eq('id', d.id).select('id') : await c.from('site_popups').insert(row).select('id'), 'Owner and Admin');
      st.form = null; st.busy = false; await loadPopups(); renderPopups(); say('Pop-up saved.');
    } catch (e) { st.busy = false; if (st.form) st.form.error = 'Could not save: ' + (e.message || e); renderPopups(); }
  }
  async function togglePopup(id, on, input) {
    try {
      var c = sb(), now = new Date().toISOString();
      if (on) { var off = await c.from('site_popups').update({ is_on: false, updated_at: now }).neq('id', id).eq('is_on', true).select('id'); if (off.error) throw off.error; }
      wrote(await c.from('site_popups').update({ is_on: on, updated_at: now }).eq('id', id).select('id'), 'Owner and Admin');
      await loadPopups(); renderPopups(); say(on ? 'Pop-up is on.' : 'Pop-up is off.');
    } catch (e) { if (input) input.checked = !on; alert('Could not change it: ' + (e.message || e)); }
  }
  async function deletePopup(id) {
    var p = st.popups.find(function (x) { return x.id === id; }); if (!p) return;
    if (!window.confirm('Delete the pop-up "' + p.name + '"?')) return;
    try { wrote(await sb().from('site_popups').delete().eq('id', id).select('id'), 'Owner and Admin'); await loadPopups(); renderPopups(); say('Pop-up deleted.'); }
    catch (e) { alert('Could not delete it: ' + (e.message || e)); }
  }

  /* ---------------- the pop-up itself (public + preview) ---------------- */
  function showPopup(p, photoUrl, preview) {
    addStyles();
    var old = document.getElementById('aswPopShade'); if (old) old.remove();
    var link = safeLink(p.button_url), img = safeImg(photoUrl);
    var shade = document.createElement('div'); shade.id = 'aswPopShade'; shade.className = 'asw-pop-shade';
    shade.setAttribute('role', 'dialog'); shade.setAttribute('aria-modal', 'true'); shade.setAttribute('aria-label', p.headline || 'Announcement');
    shade.innerHTML = '<div class="asw-pop"><button type="button" class="asw-pop-x" aria-label="Close">✕</button>' + (img ? '<img src="' + esc(img) + '" alt="">' : '') +
      '<div class="asw-pop-body"><div class="asw-pop-kind">' + esc(preview ? 'PREVIEW' : 'ALLSHIELD INSURANCE GROUP') + '</div><h3>' + esc(p.headline) + '</h3>' + (p.body ? '<p>' + esc(p.body) + '</p>' : '') +
      (p.button_label && link ? '<a class="asw-pop-btn" href="' + esc(link) + '"' + (/^https:/i.test(link) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(p.button_label) + '</a>' : '') + '</div></div>';
    function close() { shade.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    shade.addEventListener('click', function (e) { if (e.target === shade || e.target.closest('.asw-pop-x') || e.target.closest('.asw-pop-btn')) { if (preview && e.target.closest('.asw-pop-btn')) e.preventDefault(); close(); } });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(shade);
    var x = shade.querySelector('.asw-pop-x'); if (x) x.focus();
  }
  function seenKey(p) { return 'asw-popup-' + p.id + '-' + (p.updated_at || ''); }
  function shouldShow(p) {
    if (p.frequency === 'every_visit') return true;
    try {
      var v = localStorage.getItem(seenKey(p)); if (!v) return true;
      if (p.frequency === 'once') return false;
      return Date.now() - Number(v) > 24 * 60 * 60 * 1000;
    } catch (e) { return true; }
  }
  function inPortal() { return !!document.querySelector('.portal-page.show') || /[?&]portal=/.test(location.search) || !!document.querySelector('[id$="Login"].show'); }
  async function publicPopup() {
    try {
      var c = sb(); if (!c || inPortal()) return;
      var r = await c.from('site_popups').select('id,headline,body,photo_id,button_label,button_url,frequency,updated_at').order('updated_at', { ascending: false }).limit(1);
      if (r.error || !r.data || !r.data.length) return;
      var p = r.data[0]; if (!shouldShow(p) || inPortal()) return;
      var url = '';
      if (p.photo_id) { var ph = await c.from('site_photos').select('url').eq('id', p.photo_id).limit(1); if (!ph.error && ph.data && ph.data[0]) url = ph.data[0].url; }
      showPopup(p, url, false);
      try { localStorage.setItem(seenKey(p), String(Date.now())); } catch (e) { }
    } catch (e) { }
  }
  /* fill any public element marked data-photo-slot="key" with the chosen photo */
  async function publicPhotos() {
    try {
      var els = document.querySelectorAll('[data-photo-slot]'); if (!els.length) return;
      var c = sb(); if (!c) return;
      var r = await c.from('site_photo_slots').select('slot_key,site_photos!site_photo_slots_photo_id_fkey(url,label)');
      if (r.error) return;
      var map = {}; (r.data || []).forEach(function (s) { if (s.site_photos && safeImg(s.site_photos.url)) map[s.slot_key] = s.site_photos; });
      els.forEach(function (el) {
        var ph = map[el.getAttribute('data-photo-slot')]; if (!ph) return;
        if (el.tagName === 'IMG') { el.src = ph.url; if (ph.label) el.alt = ph.label; }
        else el.style.backgroundImage = 'url("' + ph.url.replace(/"/g, '%22') + '")';
      });
    } catch (e) { }
  }

  /* ---------------- open a screen ---------------- */
  async function open(portal, screen) {
    st.portal = portal; st.screen = screen; st.picker = null; st.form = null; st.busy = false; st.filter = ''; st.tab = 'spots';
    var h = host(); if (!h) return;
    addStyles();
    h.innerHTML = screen === 'photos' ? photosShell() : popupShell();
    try { if (screen === 'photos') { await loadPhotos(); renderPhotos(); } else { await loadPopups(); renderPopups(); } }
    catch (e) { var b = document.getElementById('aswBody'); if (b) b.innerHTML = '<div class="bo-card"><h3>Could not load</h3><p>' + esc(e.message || e) + '</p><div class="row-actions"><button type="button" class="tiny-btn" data-asw="retry">Try again</button></div></div>'; }
  }
  function redraw() { st.screen === 'photos' ? renderPhotos() : renderPopups(); }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target.closest('[data-asw]') : null; if (!t || t.tagName === 'INPUT') return;
    var a = t.getAttribute('data-asw');
    if (a === 'open') { t.parentElement.querySelectorAll('.side-link').forEach(function (x) { x.classList.remove('active'); }); t.classList.add('active'); return void open(t.getAttribute('data-portal'), t.getAttribute('data-screen')); }
    if (a === 'retry') return void open(st.portal, st.screen);
    if (a === 'tab') { st.tab = t.getAttribute('data-tab'); st.picker = null; st.form = null; st.filter = ''; return renderPhotos(); }
    if (a === 'filter') { if (st.form && st.form.kind === 'photo') readPhotoForm(); st.filter = t.getAttribute('data-tag') || ''; return redraw(); }
    if (a === 'form-cancel') { st.form = null; st.picker = null; return redraw(); }
    if (a === 'picker-cancel') { st.picker = null; st.filter = ''; return redraw(); }
    if (a === 'slot-change') { st.form = null; st.filter = ''; st.picker = { kind: 'slot', key: t.getAttribute('data-key') }; renderPhotos(); var f = document.querySelector('.asw-form'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'start' }); return; }
    if (a === 'slot-reset') { var s = st.slots.find(function (x) { return x.slot_key === t.getAttribute('data-key'); }); if (s) setSlot(s.slot_key, s.default_photo_id); return; }
    if (a === 'choose') {
      var id = t.getAttribute('data-id');
      if (st.picker && st.picker.kind === 'slot') return void setSlot(st.picker.key, id);
      if (st.picker && st.picker.kind === 'popup' && st.form) { st.form.data.photo_id = id; st.picker = null; st.filter = ''; return renderPopups(); }
      return;
    }
    if (a === 'photo-new') { st.picker = null; st.form = { kind: 'photo', error: '', data: { mode: 'file', url: '', label: '', tag: '' } }; renderPhotos(); var pf = document.querySelector('.asw-form'); if (pf && pf.scrollIntoView) pf.scrollIntoView({ block: 'start' }); return; }
    if (a === 'photo-mode' && st.form) { readPhotoForm(); st.form.data.mode = t.getAttribute('data-mode'); st.form.error = ''; return renderPhotos(); }
    if (a === 'photo-save') { if (!st.busy) savePhoto(); return; }
    if (a === 'photo-delete') return void deletePhoto(t.getAttribute('data-id'));
    if (a === 'popup-new') return openPopupForm(null);
    if (a === 'popup-edit') return openPopupForm(st.popups.find(function (x) { return x.id === t.getAttribute('data-id'); }));
    if (a === 'popup-delete') return void deletePopup(t.getAttribute('data-id'));
    if (a === 'popup-save') { if (!st.busy) savePopup(); return; }
    if (a === 'popup-preview') { var p = st.popups.find(function (x) { return x.id === t.getAttribute('data-id'); }); if (p) { var ph = photoById(p.photo_id); showPopup(p, ph ? ph.url : '', true); } return; }
    if (!st.form || st.form.kind !== 'popup') return;
    if (a === 'popup-kind') { readPopupForm(); st.form.data.kind = t.getAttribute('data-kind'); return renderPopups(); }
    if (a === 'popup-freq') { readPopupForm(); st.form.data.frequency = t.getAttribute('data-freq'); return renderPopups(); }
    if (a === 'popup-photo') { readPopupForm(); st.filter = ''; st.picker = { kind: 'popup' }; return renderPopups(); }
    if (a === 'popup-nophoto') { readPopupForm(); st.form.data.photo_id = null; return renderPopups(); }
    if (a === 'popup-preview-form') { readPopupForm(); var d = st.form.data, pp = photoById(d.photo_id); if (!String(d.headline || '').trim()) { st.form.error = 'Add a headline to preview it.'; return renderPopups(); } return showPopup(d, pp ? pp.url : '', true); }
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target; if (!t || !t.getAttribute || t.getAttribute('data-asw') !== 'popup-toggle') return;
    togglePopup(t.getAttribute('data-id'), t.checked, t);
  });

  /* ---------------- menu links ---------------- */
  function addLink(portal, screen, label, afterText) {
    var bar = document.querySelector('#' + portal + 'Portal .sidebar');
    if (!bar || bar.querySelector('[data-asw="open"][data-screen="' + screen + '"]')) return;
    var link = document.createElement('div');
    link.className = 'side-link'; link.setAttribute('data-asw', 'open'); link.setAttribute('data-portal', portal); link.setAttribute('data-screen', screen);
    link.setAttribute('role', 'button'); link.setAttribute('tabindex', '0'); link.textContent = '▦ ' + label;
    link.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); link.click(); } });
    var links = bar.querySelectorAll('.side-link'), after = null;
    links.forEach(function (x) { if ((x.textContent || '').indexOf(afterText) >= 0) after = x; });
    if (after && after.parentElement) after.parentElement.insertBefore(link, after.nextSibling);
    else if (links.length) links[links.length - 1].parentElement.appendChild(link);
    else bar.appendChild(link);
  }
  function boot() {
    addStyles();
    addLink('owner', 'photos', 'Site Photos', 'Brand Center');
    addLink('owner', 'popup', 'Homepage Pop-up', 'Site Photos');
    addLink('admin', 'popup', 'Homepage Pop-up', 'Marketing Center');
  }
  var publicDone = false;
  function publicBoot() {
    if (publicDone) return; publicDone = true;
    var go = function () { publicPhotos(); setTimeout(publicPopup, 1200); };
    if (window.allshieldBackendReady && typeof window.allshieldBackendReady.then === 'function') window.allshieldBackendReady.then(go, go); else go();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', function () { boot(); publicBoot(); });
  if (document.readyState === 'complete') publicBoot();
  window.allshieldWebsite = { open: open, showPopup: showPopup };
})();
