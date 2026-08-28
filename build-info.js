window.ALLSHIELD_BUILD_INFO={
  build_number:'B2026.08.23.021',
  base_build:'B2026.08.23.021',
  current_build:'B2026.08.28.029',
  label:'Production B029 — Agent Operations Core + Master Agent Profile',
  completion_release:'2026.08.28.012',
  channel:'production',
  released_at:'2026-08-28',
  certification:{
    agent_operations:'61/61 PASS',
    onboarding:'31/31 PASS',
    careers_professional_video:'16/16 PASS',
    pages:'PASS',
    owner_portal:'PASS',
    database_security:'PASS'
  },
  changes:[
    'Replaced competing Team Accounts implementations with one canonical Agent Operations Core',
    'Team Accounts now requires First Name, Last Name and Invite Email with optional Phone',
    'Generate must run before account creation and produces read-only username, temporary password and internal login identity',
    'The manage-team-user backend enforces Generate-first account creation and rejects stale generated credentials',
    'Direct agents can self-select Licensed or Not Licensed during onboarding instead of requiring Admin to guess at account creation',
    'Added one Master Agent Profile that consolidates identity, onboarding, licensing, exams, documents, programs, production, compensation, Admin communications, operational status and timeline',
    'Rebuilt the Admin command center around five exact live destinations: Active Accounts, Onboarding Users, License Ready, Avg Exam Score and Agent Emails',
    'Added agent-specific operations mail identities while keeping secure authentication identities on the allshield.internal domain',
    'External agent operations aliases remain pending until actual IONOS inbound routing verifies them',
    'Owner/Admin can read and reply to verified agent vendor communications while agents cannot access those private operational threads',
    'Preserved the existing Owner Company Communications route instead of replacing it with agent vendor mail',
    'Published Independent Contractor Agreement version 2 with Administrative Onboarding & Operational Authorization while retaining the $35 non-participating carrier chargeback',
    'Removed completed one-time install and migration workflows after canonical source changes were committed',
    'Aligned onboarding cache/version boundary to router 2026.08.28.014 and Agent Operations Core 2026.08.28.002'
  ]
};