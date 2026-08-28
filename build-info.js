window.ALLSHIELD_BUILD_INFO={
  build_number:'B2026.08.23.021',
  base_build:'B2026.08.23.021',
  current_build:'B2026.08.28.028',
  label:'Production B028 — Team Accounts Router Source Fix + Invite Email Onboarding',
  completion_release:'2026.08.28.011',
  channel:'production',
  released_at:'2026-08-28',
  certification:{
    manual_agent_onboarding:'33/33 PASS',
    esign:'28/28 PASS',
    onboarding:'25/25 PASS',
    career_application_viewer:'22/22 PASS',
    careers_public_badge:'16/16 PASS',
    pages:'PASS',
    owner_portal:'PASS'
  },
  changes:[
    'Removed the legacy Onboarding Router registration that was restoring the old Create Direct Account Team Accounts screen',
    'The router now protects and renders the current email-enabled Team Accounts onboarding form',
    'Owner Portal Team Accounts visibly shows Agent Email / Invite Email (Required)',
    'Create Account & Send Invite sends onboarding credentials to the entered real email address',
    'Manual onboarding captures first name, last name, invite email, phone, resident state, licensed/not licensed status and recruiting source',
    'Licensed and Not Licensed selections automatically assign the correct onboarding pathway',
    'Agent username is generated as First.Last',
    'Temporary password follows initials + current year + AS for the required 8-character minimum',
    'Internal ALLSHIELD login identity remains assigned automatically to every manually onboarded agent',
    'Invite email is sent from onboarding@allshieldinsurancegroup.com',
    'Permanent production certification now fails if the legacy Team Accounts screen or renderer returns'
  ]
};