(() => {
  if (typeof ownerViews === 'undefined') return;

  const year = () => new Date().getFullYear();
  const cleanNamePart = (v) => String(v || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '').slice(0, 20);
  const niceNamePart = (v) => { const s = cleanNamePart(v).toLowerCase(); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
  const escManual = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  ownerViews.teamaccounts = `
  <div class="dashboard-head"><div><div class="kicker">REAL USER MANAGEMENT</div><h2>Create and onboard ALLSHIELD accounts.</h2><p>Manual onboarding captures the information needed when an agent comes from a referral, recruiter, event or another channel outside the Careers application.</p></div><button class="btn btn-primary" onclick="refreshTeamAccounts()">Refresh Team</button></div>
  <div class="real-data-banner">LIVE SUPABASE DATA • Internal ALLSHIELD identity + real contact email + automated licensing route.</div>
  <div class="bo-grid">
    <div class="bo-card"><h3>Create Team Account</h3><div class="team-form-grid">
      <div><label>First Name</label><input id="teamFirst" class="mini-input" autocomplete="off" oninput="syncManualCredentials()"></div>
      <div><label>Last Name</label><input id="teamLast" class="mini-input" autocomplete="off" oninput="syncManualCredentials()"></div>
      <div><label>Personal / Contact Email</label><input id="teamEmail" type="email" class="mini-input" placeholder="agent@example.com"></div>
      <div><label>Phone</label><input id="teamPhone" type="tel" class="mini-input" placeholder="Optional"></div>
      <div><label>Username</label><input id="teamUsername" class="mini-input" readonly placeholder="First.Last"></div>
      <div><label>Temporary Password</label><input id="teamPassword" class="mini-input" readonly placeholder="Initials + year + AS"></div>
      <div><label>Internal Login Identity</label><input id="teamInternalEmail" class="mini-input" readonly placeholder="first.last@allshield.internal"></div>
      <div><label>Role</label><select id="teamRole" class="mini-input" onchange="syncManualRoleFields()"><option value="agent">Agent</option><option value="team_lead">Team Lead</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="staff">Staff / Employee</option></select></div>
      <div id="manualLicenseWrap"><label>Agent Licensing Status</label><select id="teamLicensing" class="mini-input"><option value="">Select Licensed or Not Licensed</option><option value="licensed">Licensed</option><option value="not_licensed">Not Licensed</option></select></div>
      <div id="manualSourceWrap"><label>Recruiting Source</label><input id="teamSource" class="mini-input" placeholder="Referral, recruiter, event, partner, etc."></div>
      <div><label>Status</label><select id="teamStatus" class="mini-input"><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="invited">Invited</option><option value="inactive">Inactive</option></select></div>
      <div><label>Department</label><select id="teamDepartment" class="mini-input"><option value="">None / Agent</option></select></div>
      <div><label>Resident State</label><input id="teamState" class="mini-input" maxlength="2" placeholder="TX"></div>
    </div>
    <div class="row-actions"><button class="btn btn-primary" onclick="createRealTeamUser()">Create & Send Welcome</button></div>
    <div id="teamCreateResult" class="publish-result"></div></div>
    <div class="bo-card"><h3>Manual Agent Rules</h3>
      <div class="requirement"><span>Username</span><span class="pill">First.Last</span></div>
      <div class="requirement"><span>Temporary password</span><span class="pill">Initials + Year + AS</span></div>
      <div class="requirement"><span>Internal identity</span><span class="reqgood">Created automatically</span></div>
      <div class="requirement"><span>Real email</span><span class="reqgood">Used for welcome/contact</span></div>
      <div class="requirement"><span>Licensed agent</span><span class="reqgood">License verification route</span></div>
      <div class="requirement"><span>Not licensed</span><span class="reqgood">Pre-licensing route</span></div>
      <div class="requirement"><span>Welcome sender</span><span class="reqgood">onboarding@allshieldinsurancegroup.com</span></div>
    </div>
  </div>
  <div class="bo-card" style="margin-top:18px"><div style="display:flex;justify-content:space-between;gap:15px;align-items:center;margin-bottom:14px"><h3 style="margin:0">Team Accounts</h3><input id="teamSearch" class="mini-input" style="max-width:260px" placeholder="Search team..." oninput="filterTeamRows()"></div><div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Name</th><th>Username</th><th>Contact Email</th><th>Role</th><th>Status</th><th>State</th><th>Department</th><th>Actions</th></tr></thead><tbody id="teamAccountRows"><tr><td colspan="8">Loading live users…</td></tr></tbody></table></div></div>`;

  window.syncManualCredentials = function(){
    const first = niceNamePart(document.getElementById('teamFirst')?.value);
    const last = niceNamePart(document.getElementById('teamLast')?.value);
    const username = first && last ? `${first}.${last}` : '';
    const password = first && last ? `${first[0]}${last[0]}${year()}AS`.toUpperCase() : '';
    const u = document.getElementById('teamUsername'), p = document.getElementById('teamPassword'), i = document.getElementById('teamInternalEmail');
    if (u) u.value = username;
    if (p) p.value = password;
    if (i) i.value = username ? `${username.toLowerCase()}@allshield.internal` : '';
  };

  window.generateTempPassword = window.syncManualCredentials;

  window.syncManualRoleFields = function(){
    const isAgent = document.getElementById('teamRole')?.value === 'agent';
    const lic = document.getElementById('manualLicenseWrap'), src = document.getElementById('manualSourceWrap');
    if (lic) lic.style.display = isAgent ? '' : 'none';
    if (src) src.style.display = isAgent ? '' : 'none';
  };

  window.createRealTeamUser = async function(){
    const r = document.getElementById('teamCreateResult');
    try {
      syncManualCredentials();
      const first = document.getElementById('teamFirst')?.value.trim() || '';
      const last = document.getElementById('teamLast')?.value.trim() || '';
      const email = document.getElementById('teamEmail')?.value.trim() || '';
      const phone = document.getElementById('teamPhone')?.value.trim() || '';
      const role = document.getElementById('teamRole')?.value || 'agent';
      const licensing = document.getElementById('teamLicensing')?.value || '';
      const source = document.getElementById('teamSource')?.value.trim() || '';
      if (!first || !last) throw new Error('First name and last name are required.');
      if (role === 'agent' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid contact email is required for manual agent onboarding.');
      if (role === 'agent' && !licensing) throw new Error('Select Licensed or Not Licensed.');
      if (role === 'agent' && !source) throw new Error('Enter the recruiting source for this manual onboarding.');
      const payload = {
        action:'create',
        username:document.getElementById('teamUsername')?.value.trim() || '',
        password:document.getElementById('teamPassword')?.value || '',
        first_name:first,
        last_name:last,
        email,
        phone,
        licensing_status:role === 'agent' ? licensing : null,
        recruiting_source:role === 'agent' ? source : null,
        role,
        status:document.getElementById('teamStatus')?.value || 'onboarding',
        department_id:document.getElementById('teamDepartment')?.value || null,
        resident_state:(document.getElementById('teamState')?.value || '').trim().toUpperCase() || null
      };
      const d = await allshieldManageTeamUser(payload);
      if (r) {
        const emailLine = role === 'agent' ? `<br>Welcome email: <strong>${d.notification_sent ? 'SENT' : 'NOT SENT'}</strong>${d.notification_error ? ` — ${escManual(d.notification_error)}` : ''}` : '';
        r.innerHTML = `<strong>Account created.</strong><br>Username: ${escManual(d.username)}<br>Temporary password: ${escManual(d.temp_password || payload.password)}<br>Internal login: ${escManual(d.internal_email || '')}${email ? `<br>Contact email: ${escManual(email)}` : ''}${d.onboarding_pathway ? `<br>Route: ${escManual(d.onboarding_pathway)}` : ''}${emailLine}`;
        r.classList.add('show');
      }
      await refreshTeamAccounts();
      toast(role === 'agent' && d.notification_sent ? 'Agent created and welcome email sent.' : 'ALLSHIELD account created.');
    } catch(e) {
      if (r) { r.textContent = 'Error: ' + (e.message || e); r.classList.add('show'); }
    }
  };

  window.refreshTeamAccounts = async function(){
    const body = document.getElementById('teamAccountRows'); if (!body) return;
    body.innerHTML = '<tr><td colspan="8">Loading live users…</td></tr>';
    try {
      const users = await allshieldListTeamUsers();
      body.innerHTML = users.map(u => {
        const name = ((u.first_name||'')+' '+(u.last_name||'')).trim() || '—';
        const username = u.username || '—';
        const dept = u.departments?.name || '—';
        const owner = u.role === 'owner';
        const search = (name+' '+username+' '+(u.email||'')+' '+u.role+' '+u.status).toLowerCase();
        return `<tr data-search="${escManual(search)}"><td>${escManual(name)}</td><td>${escManual(username)}</td><td>${escManual(u.email||'—')}</td><td><span class="rolebadge">${escManual(u.role)}</span></td><td>${escManual(u.status)}</td><td>${escManual(u.resident_state||'—')}</td><td>${escManual(dept)}</td><td><div class="team-actions"><button class="tiny-btn" onclick="editRealTeamUser('${u.id}','${u.role}','${u.status}')">Role / Status</button><button class="tiny-btn" onclick="resetRealPassword('${u.id}','${escManual(username)}')">Reset Password</button>${owner?'':`<button class="tiny-btn" onclick="deleteRealTeamUser('${u.id}','${escManual(username)}')">Delete</button>`}</div></td></tr>`;
      }).join('') || '<tr><td colspan="8">No users found.</td></tr>';
    } catch(e) { body.innerHTML = `<tr><td colspan="8">Error: ${escManual(e.message||e)}</td></tr>`; }
  };

  const previousOwnerShow = window.showOwnerView;
  if (typeof previousOwnerShow === 'function' && !previousOwnerShow.__manualOnboardingWrapped) {
    const wrapped = function(view, el){
      previousOwnerShow(view, el);
      setTimeout(() => {
        if (view === 'teamaccounts') {
          if (typeof loadTeamDepartments === 'function') loadTeamDepartments();
          syncManualCredentials();
          syncManualRoleFields();
          refreshTeamAccounts();
        }
      }, 40);
    };
    wrapped.__manualOnboardingWrapped = true;
    window.showOwnerView = wrapped;
  }
})();
