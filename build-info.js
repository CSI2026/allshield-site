window.ALLSHIELD_BUILD_INFO={
  build_number:'B2026.08.23.021',
  base_build:'B2026.08.23.021',
  current_build:'B2026.08.28.032',
  label:'Production B032 — Owner Agreement Center Edge CORS Recovery',
  completion_release:'2026.08.28.015',
  channel:'production',
  released_at:'2026-08-28',
  certification:{
    document_esign_cors:'14/14 PASS',
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
    'Fixed the Owner Signature & Agreements Agreement Center browser failure at the document-esign Edge Function boundary',
    'Replaced the stale hard-coded document-esign CORS allow-list with Supabase SDK-managed CORS headers so x-client-info, retry and trace headers stay compatible with current browser clients',
    'Preserved JWT verification, Owner/Admin authorization and all existing E-Sign signing and countersigning controls',
    'Promoted document-esign Edge Function to version 2 and added no-store response handling',
    'Added the canonical document-esign Edge Function source to the repository so production backend behavior is version controlled',
    'Added a permanent browser CORS certification covering preflight, required headers, POST/OPTIONS methods, endpoint reachability and CORS on error responses',
    'B032 browser CORS certification passed 14/14 and existing production E-Sign certification passed 28/28',
    'Retained B031 cross-portal dashboard tile routing and B030 count-integrity behavior unchanged'
  ]
};