# Allshield Insurance Group

This repository is now the source of truth for the Allshield website and back-office application.

## Current production foundation

- Public Allshield website and Careers recruiting experience
- Owner, Admin, and Agent portal shells
- Supabase authentication with username-to-internal-email mapping
- Role-gated portal access
- Live Owner Team Accounts management
- Real Supabase user creation, role/status management, password reset, and non-owner deletion through the protected `manage-team-user` Edge Function
- Database foundation for onboarding, state licensing, academy courses, exams, production, promotions, internal messaging, social publishing, media assets, AI jobs, and audit logs
- Private Storage buckets for owner vault, media, and documents

## Architecture

The browser receives only the Supabase publishable key. Administrative Auth operations are performed by protected Supabase Edge Functions. Secrets for social platforms, AI providers, email providers, and other privileged integrations must stay server-side and must never be committed to this repository.

## Development workflow

GitHub + Supabase are the canonical development environment. Avoid creating new numbered local ZIP builds as the primary workflow. Changes should be committed here and deployed from this repository.

## Connected Supabase project

Project ref: `xxeiddnfbdqxwuojuggy`

The Supabase publishable key is intentionally safe for browser use. Secret/service-role keys must never be committed.
