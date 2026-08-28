window.ALLSHIELD_BUILD_INFO={
  build_number:'B2026.08.23.021',
  base_build:'B2026.08.23.021',
  current_build:'B2026.08.28.027',
  label:'Production B027 — Live Team Accounts Invite Email Fix + Complete Manual Agent Onboarding',
  completion_release:'2026.08.28.010',
  channel:'production',
  released_at:'2026-08-28',
  certification:{
    manual_agent_onboarding:'29/29 PASS',
    esign:'28/28 PASS',
    onboarding:'25/25 PASS',
    career_application_viewer:'22/22 PASS',
    careers_public_badge:'16/16 PASS',
    pages:'PASS',
    owner_portal:'PASS'
  },
  changes:[
    'Fixed the registered Onboarding Router Team Accounts priority so the live Owner form renders the current email-enabled manual onboarding screen',
    'Owner Portal Team Accounts now visibly shows Agent Email / Invite Email (Required)',
    'The onboarding invite and temporary login credentials are sent to the entered invite email',
    'Create Account & Send Invite is the manual onboarding action for agents from outside the Careers application',
    'Manual agent onboarding captures first name, last name, invite email, phone, resident state and recruiting source',
    'Licensed and Not Licensed selections automatically assign the correct onboarding pathway',
    'Agent username is generated as First.Last',
    'Temporary password follows initials + current year + AS for the required 8-character minimum',
    'Internal ALLSHIELD login identity remains assigned automatically to every manually onboarded agent',
    'Invite email is sent from onboarding@allshieldinsurancegroup.com',
    'Legacy Create Direct Account priority screen no longer overrides the current Team Accounts onboarding form'
  ]
};