/* Allshield — Spanish / English switch for the public site, the Agent portal and the Academy.
   A small "Español" button turns the visible text into Spanish. Text is translated once by the
   Supabase function "site-translate", saved in a shared cache, and reused for everyone after that.
   The Owner and Admin portals are left in English on purpose, so team and customer records are
   never sent out for translation. */
(function () {
  'use strict';
  var LS_LANG = 'allshield_lang', LS_CACHE = 'allshield_tr_es_v1';
  var URL_BASE = 'https://xxeiddnfbdqxwuojuggy.supabase.co', PUB_KEY = 'sb_publishable_-JRPOYo13dO2h35TFkvR5Q_csWn9NFE';
  var EMBED = false; try { EMBED = window.self !== window.top; } catch (e) { EMBED = true; }
  var lang = 'en'; try { lang = localStorage.getItem(LS_LANG) === 'es' ? 'es' : 'en'; } catch (e) { }
  var cache = {}, misses = {}, rec = new WeakMap(), attrRec = new WeakMap(), queue = {}, flushTimer = null, active = 0, saveTimer = null, observers = [], roots = [];
  try { cache = JSON.parse(localStorage.getItem(LS_CACHE) || '{}') || {}; } catch (e) { cache = {}; }
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1, IFRAME: 1, SVG: 1, OPTION: 0 };
  var ATTRS = ['placeholder', 'aria-label', 'title'];

  function client() { return window.allshieldSupabase || window.__asAcademyClient || null; }
  function skipEl(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP_TAGS[n.tagName]) return true;
      var id = n.id;
      if (id === 'ownerPortal' || id === 'adminPortal' || id === 'ownerLogin' || id === 'adminLogin' || id === 'asLangBtn' || id === 'asBridgeNote') return true;
      if (n.hasAttribute && (n.hasAttribute('data-no-translate') || n.isContentEditable)) return true;
      if (n.classList && n.classList.contains('sidebar')) return true;   /* the home screens match menu links by their English names */
      if (n.classList && (n.classList.contains('notranslate') || (n.classList.contains('m') && n.classList.contains('u')))) return true;
    }
    return false;
  }
  function worth(t) {
    if (!t || t.length < 2 || t.length > 3000) return false;
    if (!/[A-Za-z]{2}/.test(t)) return false;
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(t) || /^https?:\/\//i.test(t)) return false;
    var letters = (t.match(/[A-Za-z]/g) || []).length;
    if (letters / t.length < 0.35) return false;
    return true;
  }
  function want(text, apply) {
    if (cache[text]) return apply(cache[text]);
    if (misses[text]) return;
    (queue[text] = queue[text] || []).push(apply);
    clearTimeout(flushTimer); flushTimer = setTimeout(flush, 250);
  }
  function doText(node) {
    var p = node.parentNode; if (!p || p.nodeType !== 1 || skipEl(p)) return;
    var val = node.nodeValue, core = val.trim(); if (!core) return;
    var r = rec.get(node);
    if (r && core === r.es) return;                     /* already Spanish */
    if (!r || core !== r.src) { r = { src: core, es: null }; rec.set(node, r); }
    if (!worth(core)) return;
    var keep = r;
    want(core, function (es) {
      if (lang !== 'es' || rec.get(node) !== keep || node.nodeValue.trim() !== keep.src) return;
      keep.es = es; node.nodeValue = node.nodeValue.replace(keep.src, es);
    });
  }
  function doAttrs(el) {
    if (skipEl(el)) return;
    ATTRS.forEach(function (a) {
      var v = el.getAttribute(a); if (!v) return;
      var core = v.trim(), store = attrRec.get(el); if (!store) { store = {}; attrRec.set(el, store); }
      var r = store[a];
      if (r && core === r.es) return;
      if (!r || core !== r.src) { r = store[a] = { src: core, es: null }; }
      if (!worth(core)) return;
      var keep = r;
      want(core, function (es) { if (lang !== 'es' || el.getAttribute(a) !== keep.src) return; keep.es = es; el.setAttribute(a, es); });
    });
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && skipEl(root)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null), n;
    if (root.nodeType === 1) doAttrs(root);
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function restore(root) {
    if (!root) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { var r = rec.get(n); if (r && r.es && n.nodeValue.trim() === r.es) n.nodeValue = n.nodeValue.replace(r.es, r.src); }
      else { var s = attrRec.get(n); if (s) ATTRS.forEach(function (a) { var x = s[a]; if (x && x.es && n.getAttribute(a) === x.es) n.setAttribute(a, x.src); }); }
    }
  }
  async function ask(texts) {
    var c = client();
    if (c && c.functions) {
      var r = await c.functions.invoke('site-translate', { body: { lang: 'es', texts: texts } });
      if (r.error || !r.data) throw new Error('translate failed');
      return r.data.translations || [];
    }
    var res = await fetch(URL_BASE + '/functions/v1/site-translate', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUB_KEY, Authorization: 'Bearer ' + PUB_KEY }, body: JSON.stringify({ lang: 'es', texts: texts }) });
    if (!res.ok) throw new Error('translate failed');
    return (await res.json()).translations || [];
  }
  function saveCache() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { try { var s = JSON.stringify(cache); if (s.length < 2500000) localStorage.setItem(LS_CACHE, s); } catch (e) { } }, 1200);
  }
  function flush() {
    if (lang !== 'es') { queue = {}; return; }
    while (active < 3) {
      var keys = Object.keys(queue); if (!keys.length) return;
      var batch = [], chars = 0;
      for (var i = 0; i < keys.length && batch.length < 40; i++) { if (chars + keys[i].length > 9000 && batch.length) break; batch.push(keys[i]); chars += keys[i].length; }
      var waiting = {}; batch.forEach(function (k) { waiting[k] = queue[k]; delete queue[k]; });
      active++;
      (function (batch, waiting) {
        ask(batch).then(function (out) {
          batch.forEach(function (k, i) { var es = out[i]; if (es) { cache[k] = es; (waiting[k] || []).forEach(function (fn) { try { fn(es); } catch (e) { } }); } else misses[k] = 1; });
          saveCache();
        }, function () { batch.forEach(function (k) { misses[k] = 1; }); setTimeout(function () { batch.forEach(function (k) { delete misses[k]; }); }, 30000); })
          .then(function () { active--; flush(); });
      })(batch, waiting);
    }
  }
  function findRoots() {
    var list = [document.body];
    var apx = document.getElementById('apxSite'); if (apx && apx.shadowRoot) list.push(apx.shadowRoot);
    return list;
  }
  function watch() {
    findRoots().forEach(function (r) {
      if (roots.indexOf(r) >= 0) return; roots.push(r);
      if (!window.MutationObserver) return;
      var mo = new MutationObserver(function (muts) {
        if (lang !== 'es') return;
        muts.forEach(function (m) {
          if (m.type === 'characterData') doText(m.target);
          else if (m.type === 'attributes') doAttrs(m.target);
          else m.addedNodes.forEach(function (n) { walk(n); });
        });
      });
      mo.observe(r, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      observers.push(mo);
    });
  }
  function apply() {
    document.documentElement.setAttribute('lang', lang === 'es' ? 'es' : 'en');
    watch();
    roots.forEach(function (r) { if (lang === 'es') walk(r); else restore(r); });
    paint();
  }
  function setLang(l, fromStorage) {
    lang = l === 'es' ? 'es' : 'en';
    if (!fromStorage) { try { localStorage.setItem(LS_LANG, lang); } catch (e) { } }
    misses = {}; apply();
  }
  /* ---------- the button ---------- */
  var btn = null;
  function hiddenHere() { return EMBED || !!document.querySelector('#ownerPortal.show, #adminPortal.show, #ownerLogin.show, #adminLogin.show'); }
  function paint() {
    if (!btn) return;
    btn.textContent = lang === 'es' ? 'English' : 'Español';
    btn.setAttribute('aria-label', lang === 'es' ? 'Switch the site to English' : 'Cambiar el sitio a español');
    btn.style.display = hiddenHere() ? 'none' : '';
  }
  function addButton() {
    if (btn || EMBED) return;
    var st = document.createElement('style');
    st.textContent = '#asLangBtn{position:fixed;left:14px;bottom:14px;z-index:9990;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:#0a1830;color:#fff;font:700 13px Arial,Helvetica,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)}#asLangBtn:hover{background:#155e9b}@media(max-width:900px){#asLangBtn{bottom:88px;left:10px;padding:9px 13px}}';
    document.head.appendChild(st);
    btn = document.createElement('button'); btn.id = 'asLangBtn'; btn.type = 'button';
    btn.addEventListener('click', function () { setLang(lang === 'es' ? 'en' : 'es'); });
    document.body.appendChild(btn);
    if (window.MutationObserver) new MutationObserver(paint).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
    paint();
  }
  window.addEventListener('storage', function (e) { if (e.key === LS_LANG) setLang(e.newValue === 'es' ? 'es' : 'en', true); });
  function boot() { addButton(); apply(); setTimeout(apply, 1500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', function () { setTimeout(apply, 300); });
  window.allshieldLang = { get: function () { return lang; }, set: setLang, pending: function () { return Object.keys(queue).length + active; } };
})();
