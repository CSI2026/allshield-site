/* Allshield Academy bridge — loaded by allshield-academy.html before the course starts.
   1. Saves each agent's progress and scores to their account (table academy_progress), so it
      follows them between devices and the Owner/Admin can see it.
   2. Connects the "Ask Ava" box to the real AI tutor (Supabase function academy-tutor).
   If the person is not signed in, the course still works: progress stays on the device and
   Ava answers from the course text. */
(function () {
  'use strict';
  var KEY = 'allshield_academy_v1', TS = 'allshield_academy_v1_ts';
  var cfg = window.ALLSHIELD_CONFIG || {}, client = null, session = null, ready = false, timer = null, pending = null, asked = 0, history = [];
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function note(msg, ok) {
    var n = document.getElementById('asBridgeNote');
    if (!n) { n = document.createElement('div'); n.id = 'asBridgeNote'; n.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:5;max-width:280px;padding:8px 12px;border-radius:999px;font:600 12px system-ui,Arial,sans-serif;box-shadow:0 6px 18px rgba(15,26,56,.18)'; (document.body || document.documentElement).appendChild(n); }
    n.textContent = msg; n.style.background = ok ? '#e5f6ef' : '#fff4d6'; n.style.color = ok ? '#12805c' : '#7a5200';
  }
  function ids(list) { return (list || []).map(function (i) { return i.id; }); }
  function summarize(S) {
    var I = (window.__academy && window.__academy.items) || {}, P = I.prep || {}, A = I.as || {};
    var prep = ids(P.req).concat(ids(P.exam)), tr = ids(A.req), d = S.done || {}, best = null;
    ids(P.exam).concat(ids(P.sims)).forEach(function (id) { var sc = (S.scores || {})[id]; if (sc && typeof sc.best === 'number') best = Math.max(best == null ? 0 : best, sc.best); });
    return { prep_done: prep.filter(function (i) { return d[i]; }).length, prep_total: prep.length, training_done: tr.filter(function (i) { return d[i]; }).length, training_total: tr.length, best_exam: best };
  }
  async function push(S) {
    if (!client || !session) return;
    try {
      var now = new Date().toISOString(), row = summarize(S);
      row.user_id = session.user.id; row.state = S; row.updated_at = now; row.tutor_questions = asked;
      var r = await client.from('academy_progress').upsert(row, { onConflict: 'user_id' });
      if (r.error) throw r.error;
      try { localStorage.setItem(TS, now); } catch (e) { }
      note('Progress saved to your account', true);
    } catch (e) { note('Could not save progress online. It is still saved on this device.', false); }
  }
  /* called by the course every time it saves */
  window.__asAcademySync = function (S) {
    pending = S; if (!ready) return;
    clearTimeout(timer); timer = setTimeout(function () { var s = pending; pending = null; if (s) push(s); }, 1500);
  };
  /* called by the "Save & Exit" button in the back office: save right now, then tell the caller when done */
  window.__asAcademyFlush = async function () {
    clearTimeout(timer);
    var s = pending; pending = null;
    if (!s && window.__academy && window.__academy.S) s = window.__academy.S();
    if (s && ready) { try { await push(s); } catch (e) { } }
    return true;
  };
  /* called by the "Ask Ava" box */
  window.__asTutor = function (question, lesson, ok, fail) {
    if (!client || !session) return fail();
    var ctx = ''; try { var el = document.querySelector('.ov .in'); ctx = el ? (el.innerText || '').slice(0, 6000) : ''; } catch (e) { }
    var done = false, bail = setTimeout(function () { if (!done) { done = true; fail(); } }, 45000);
    client.functions.invoke('academy-tutor', { body: { question: String(question).slice(0, 1200), chapter: lesson && lesson.title ? String(lesson.title) : '', context: ctx, history: history.slice(-6), lang: (function () { try { return localStorage.getItem('allshield_lang') === 'es' ? 'es' : 'en'; } catch (e) { return 'en'; } })() } })
      .then(function (r) {
        if (done) return; done = true; clearTimeout(bail);
        var text = r && r.data && r.data.text;
        if (r.error || !text) return fail();
        history.push({ role: 'user', text: String(question) }, { role: 'assistant', text: text }); asked++;
        ok(esc(text).replace(/\n/g, '<br>'));
        if (window.__academy) window.__asAcademySync(window.__academy.S());
      }, function () { if (!done) { done = true; clearTimeout(bail); fail(); } });
  };
  async function start() {
    try {
      if (!window.supabase || !window.supabase.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) return note('Offline mode: progress is saved on this device only.', false);
      client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
      window.__asAcademyClient = client;
      var s = await client.auth.getSession(); session = s && s.data ? s.data.session : null;
      if (!session) { note('Sign in to the Agent Portal to save progress and use the AI tutor.', false); return; }
      var r = await client.from('academy_progress').select('state,tutor_questions,updated_at').eq('user_id', session.user.id).limit(1);
      var row = !r.error && r.data && r.data[0] ? r.data[0] : null, localTs = null, localRaw = null;
      try { localTs = localStorage.getItem(TS); localRaw = localStorage.getItem(KEY); } catch (e) { }
      if (row) asked = row.tutor_questions || 0;
      var serverNewer = row && row.state && Object.keys(row.state.done || {}).length + Object.keys(row.state.scores || {}).length > 0 && (!localTs || Date.parse(row.updated_at) > Date.parse(localTs) + 2000);
      var once = false; try { once = sessionStorage.getItem('asAcademyRestored') === '1'; } catch (e) { }
      if (serverNewer && !once && JSON.stringify(row.state) !== localRaw) {
        /* this device is behind the account: load the account's progress, then restart the course once */
        try { localStorage.setItem(KEY, JSON.stringify(row.state)); localStorage.setItem(TS, row.updated_at); sessionStorage.setItem('asAcademyRestored', '1'); } catch (e) { }
        return location.reload();
      }
      ready = true; note('Signed in. Progress saves to your account.', true);
      if (pending) window.__asAcademySync(pending);
      else if (!row && window.__academy) push(window.__academy.S());
    } catch (e) { note('Offline mode: progress is saved on this device only.', false); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
