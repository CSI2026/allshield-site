window.ALLSHIELD_BUILD_INFO={
  build_number:'B2026.08.23.021',
  base_build:'B2026.08.23.021',
  current_build:'B2026.08.28.030',
  label:'Production B030 — Admin Dashboard Count Integrity',
  completion_release:'2026.08.28.013',
  channel:'production',
  released_at:'2026-08-28',
  certification:{
    agent_operations:'61/61 PASS',
    dashboard_count_integrity:'PASS',
    onboarding:'31/31 PASS',
    esign:'28/28 PASS',
    careers_professional_video:'PASS',
    pages:'PASS',
    owner_portal:'PASS',
    database_security:'PASS'
  },
  changes:[
    'Fixed Admin dashboard counts so related onboarding, licensing, exam and email records are counted only when they belong to a current valid agent profile',
    'Removed Owner/Admin onboarding progress from the Agent Onboarding Users tile without deleting legitimate Owner/Admin records',
    'Onboarding Users tile and onboarding queue now use the same valid-agent population and return the same number of people',
    'License Ready, Avg Exam Score and Agent Email aggregates now ignore records that do not belong to the current agent population',
    'Agent Operations Edge Function promoted to version 3 with JWT protection preserved',
    'Retained B029 Agent Operations Core, Master Agent Profile, Generate-first Team Accounts, E-Sign and Company Communications behavior unchanged'
  ]
};