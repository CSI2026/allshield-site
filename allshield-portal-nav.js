/* Allshield — Home and Log out buttons that are always on screen inside the back office
   (Agent, Admin and Owner). Home goes to the back-office home screen. Log out signs the
   person out and returns to the website. Nothing existing is changed. */
(function () {
  'use strict';
  var ROLES = ['agent', 'admin', 'owner'];
  function style() {
    if (document.getElementById('asNavStyle')) return;
    var s = document.createElement('style'); s.id = 'asNavStyle';
    s.textContent = '.as-nav{position:fixed;bottom:14px;right:14px;z-index:9985;display:flex;gap:8px}' +
      '.as-nav button{padding:9px 15px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:#0a1830;color:#fff;font:700 13px Arial,Helvetica,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)}' +
      '.as-nav button:hover{background:#155e9b}.as-nav .as-nav-out{background:#3a1420;border-color:rgba(255,120,120,.5)}.as-nav .as-nav-out:hover{background:#8f1d1d}' +
      '@media(max-width:900px){.as-nav{bottom:14px;right:10px}.as-nav button{padding:9px 12px}}';
    document.head.appendChild(s);
  }
  function portalOf(role) { return document.getElementById(role + 'Portal'); }
  function activeRole() { for (var i = 0; i < ROLES.length; i++) { var p = portalOf(ROLES[i]); if (p && p.classList.contains('show')) return ROLES[i]; } return null; }
  function home() {
    var role = activeRole(); if (!role) return;
    var p = portalOf(role);
    if (window.allshieldHubHome && typeof window.allshieldHubHome[role] === 'function') window.allshieldHubHome[role]();
    else {
      var hubHome = document.querySelector('#' + role + 'Hub [data-hub-home]');
      if (hubHome) hubHome.click();
      else { var first = p.querySelector('.sidebar .side-link'); if (first) first.click(); }   /* old side menu */
    }
    window.scrollTo(0, 0);
  }
  function logout() {
    if (!confirm('Log out of the back office?')) return;
    if (typeof window.allshieldSignOut === 'function') window.allshieldSignOut();
    else if (typeof window.returnHome === 'function') window.returnHome();
  }
  function ensure(role) {
    var p = portalOf(role); if (!p || p.querySelector('.as-nav')) return;
    var nav = document.createElement('div'); nav.className = 'as-nav'; nav.setAttribute('data-no-translate', '');
    nav.innerHTML = '<button type="button" class="as-nav-home" aria-label="Back office home">⌂ Home</button><button type="button" class="as-nav-out" aria-label="Log out">Log out</button>';
    nav.querySelector('.as-nav-home').addEventListener('click', home);
    nav.querySelector('.as-nav-out').addEventListener('click', logout);
    p.appendChild(nav);
  }
  function boot() { style(); ROLES.forEach(ensure); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', boot);
  window.allshieldPortalNav = { home: home, logout: logout };
})();
