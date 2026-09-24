(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function render(role) {
    const host = document.getElementById(role + 'Main');
    if (!host) return;
    host.innerHTML = '<div class="bo-card">Loading accounts…</div>';
    try {
      const users = await window.allshieldListTeamUsers();
      const isOwner = window.currentAllshieldProfile?.role === 'owner';
      host.innerHTML = `<div class="dashboard-head"><div><div class="kicker">ACCOUNT ACCESS</div><h2>Sign-in and password help.</h2><p>Closing an account blocks sign-in while retaining payroll and agreement history. A reset link goes to the contact email on file.</p></div><button class="btn btn-primary" id="accessRefresh">Refresh</button></div><div class="bo-card team-table-wrap" style="margin-top:18px"><table class="team-live-table"><thead><tr><th>Person</th><th>Username</th><th>Contact email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>${users.map(u => {
        const protectedAccount = u.role === 'owner' || (!isOwner && u.role === 'admin');
        const actions = protectedAccount ? '<span class="pill">Protected</span>' : `<button class="tiny-btn" data-access="reset" data-id="${escape(u.id)}">Generate password</button> <button class="tiny-btn" data-access="email" data-id="${escape(u.id)}">Email reset link</button> <button class="tiny-btn" data-access="toggle" data-id="${escape(u.id)}">${['inactive','terminated'].includes(u.status) ? 'Restore sign-in' : 'Suspend sign-in'}</button> <button class="tiny-btn" data-access="close" data-id="${escape(u.id)}">Close account</button>`;
        return `<tr><td>${escape([u.first_name,u.last_name].filter(Boolean).join(' '))}</td><td>${escape(u.username)}</td><td>${escape(u.email || 'No contact email')}</td><td>${escape(u.role)}</td><td>${escape(u.status)}</td><td>${actions}</td></tr>`;
      }).join('')}</tbody></table></div>`;
      host.querySelector('#accessRefresh').onclick = () => render(role);
      host.querySelectorAll('[data-access]').forEach(button => button.onclick = async () => {
        const user = users.find(u => u.id === button.dataset.id);
        if (!user) return;
        const action = button.dataset.access;
        if (action === 'reset' && !confirm(`Generate a new password for ${user.username}? The old password will stop working.`)) return;
        if (action === 'close' && !confirm(`Close ${user.username}'s account? Sign-in will be blocked and payroll history retained.`)) return;
        if (action === 'toggle' && !confirm(`${['inactive','terminated'].includes(user.status) ? 'Restore' : 'Suspend'} sign-in for ${user.username}?`)) return;
        try {
          if (action === 'reset') {
            const result = await window.allshieldManageTeamUser({action:'reset_password',user_id:user.id});
            prompt('Copy this temporary password now. It will not be displayed again:',result.temp_password);
          } else if (action === 'email') {
            if (!user.email) throw new Error('Add a verified contact email to this profile first.');
            const {error} = await window.allshieldSupabase.functions.invoke('ionos-mail',{body:{action:'password_recovery',identity:user.username}});
            if (error) throw error;
            alert('If the contact email is available, a reset link was sent.');
          } else if (action === 'close') {
            await window.allshieldManageTeamUser({action:'close_account',user_id:user.id});
          } else {
            await window.allshieldManageTeamUser({action:'update',user_id:user.id,status:['inactive','terminated'].includes(user.status)?'active':'inactive'});
          }
          if (action !== 'email') await render(role);
        } catch (error) { alert(error.message || 'Account action failed.'); }
      });
    } catch (error) { host.innerHTML = `<div class="bo-card">${escape(error.message || 'Accounts unavailable.')}</div>`; }
  }
  function install() {
    if (typeof window.registerAllshieldView !== 'function') return setTimeout(install,100);
    for (const role of ['owner','admin']) {
      const sidebar = document.querySelector('#' + role + 'Portal .sidebar');
      if (!sidebar) continue;
      const link = document.createElement('div');link.className = 'side-link';link.textContent = '🔐 Account Access';
      link.onclick = () => role === 'owner' ? window.showOwnerView('accountaccess',link) : window.showAdminView('accountaccess',link);
      sidebar.appendChild(link);
      window.registerAllshieldView(role,'accountaccess',() => render(role));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
