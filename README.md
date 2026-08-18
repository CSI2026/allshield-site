# Allshield Insurance Group

This repository is the source of truth for the Allshield public website and back-office platform.

## Structure

- `index.html` — approved page and portal markup
- `styles.css` — approved visual system and responsive styles
- `app.js` — public-site and portal UI behavior
- `team-accounts.js` — Owner Team Accounts UI and account-management actions
- `backend.js` — Supabase authentication and browser data access
- `config.js` — browser-safe Supabase project configuration
- `assets/` — extracted original brand/site image bytes
- `supabase/` — database and Edge Function source/reference files
- `tests/` — automated static/security checks

## Workflow

GitHub + Supabase are canonical. Changes are committed here and automatically validated. Numbered local ZIP builds are no longer the primary development workflow.

## Security

Browser code contains only the Supabase publishable key. Secret/service-role keys, AI keys, social-platform secrets, and other privileged credentials remain server-side.
