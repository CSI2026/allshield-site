window.ALLSHIELD_BUILD_INFO={
  build_number:'B2026.08.23.021',
  base_build:'B2026.08.23.021',
  current_build:'B2026.08.28.031',
  label:'Production B031 — Cross-Portal Dashboard Tile Routing',
  completion_release:'2026.08.28.014',
  channel:'production',
  released_at:'2026-08-28',
  certification:{
    dashboard_tile_routing:'31/31 PASS',
    dashboard_count_integrity:'PASS',
    agent_operations:'61/61 PASS',
    onboarding:'31/31 PASS',
    esign:'28/28 PASS',
    careers_professional_video:'PASS',
    pages:'PASS',
    owner_portal:'PASS',
    database_security:'PASS'
  },
  changes:[
    'Made all four Owner dashboard tiles clickable and routed each to an exact live work queue',
    'Owner Active Field Agents, States Represented, Licensing Records and Exam Ready counts now use the same valid-agent dataset as their destination queues',
    'Added Owner dashboard queue tables with direct Master Agent Profile access where an agent record applies',
    'Made all four Agent dashboard tiles clickable: Onboarding, License Readiness, Latest Exam and Qualified Records route to their exact work areas',
    'Re-certified all five Admin command-center tiles and preserved B030 valid-agent count filtering',
    'Added a permanent cross-portal dashboard tile routing certification that fails future builds if Owner, Admin or Agent tile destinations break',
    'Owner dashboard Edge Function promoted to version 2 with protected exact queue actions',
    'Removed the completed one-time B031 cache migration workflow after canonical loader versions were published',
    'Retained B029 Agent Operations Core, Master Agent Profile, Generate-first Team Accounts, E-Sign and Company Communications behavior unchanged'
  ]
};