(() => {
  const sb = window.allshieldSupabase;
  if (!sb) return;

  async function invokeMail(action, payload={}) {
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Sign in to the Allshield back office first.');
    const cfg = window.ALLSHIELD_CONFIG || {};
    const res = await fetch(`${cfg.SUPABASE_URL}/functions/v1/ionos-mail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action, ...payload })
    });
    const raw = await res.text();
    let data = {}; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw }; }
    if (!res.ok || data.error) throw new Error(data.error || `Mail service error ${res.status}`);
    return data;
  }

  window.testAllshieldMailConnection = async () => {
    const btn = document.getElementById('allshieldMailTestBtn');
    const out = document.getElementById('allshieldMailTestResult');
    if (btn) { btn.disabled = true; btn.textContent = 'Testing…'; }
    if (out) out.textContent = 'Testing secure IONOS SMTP and IMAP authentication…';
    try {
      const smtp = await invokeMail('test_smtp');
      const imap = await invokeMail('test_imap');
      if (out) out.innerHTML = `<strong>Connected.</strong> SMTP: ${smtp.smtp_connected ? 'PASS' : 'FAIL'} • IMAP: ${imap.imap_connected ? 'PASS' : 'FAIL'}`;
      return { smtp, imap };
    } catch (e) {
      if (out) out.textContent = `Connection test failed: ${e.message || e}`;
      throw e;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Test IONOS Connection'; }
    }
  };

  function installPanel() {
    if (document.getElementById('allshieldMailConnectorPanel')) return;
    const ownerPortal = document.getElementById('ownerPortal');
    if (!ownerPortal) return;
    const panel = document.createElement('div');
    panel.id = 'allshieldMailConnectorPanel';
    panel.className = 'bo-card';
    panel.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:9999;max-width:360px;box-shadow:0 14px 36px rgba(0,0,0,.28)';
    panel.innerHTML = `<h3 style="margin-top:0">Allshield Email Connection</h3><p id="allshieldMailTestResult" style="font-size:13px">IONOS credentials are stored server-side. Run the live authentication test.</p><button id="allshieldMailTestBtn" class="btn btn-primary" onclick="testAllshieldMailConnection()">Test IONOS Connection</button>`;
    ownerPortal.appendChild(panel);
  }

  window.addEventListener('load', () => setTimeout(installPanel, 1200));
  setTimeout(installPanel, 1800);
})();
