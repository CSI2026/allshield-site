# Maya B037 professional paid-marketing readiness

B037 is a staging extension of certified B036. It must not be promoted to production until live prerequisites are real and tested.

## Professional capabilities staged
- Short and long paid-ad copy, headlines, descriptions, CTAs, platform variants.
- Campaign draft packages: audience messaging, targeting briefs, landing-page copy, conversion tracking, UTM plans, A/B tests, and creative specs.
- GPT-Image-2 image and thumbnail generation with draft-only media storage.
- Video scripts, storyboards, captions, voiceovers, production packages, provider-agnostic finished-video requests, and Video Editor handoff.
- Explicit provider and paid-media account readiness checks.

## Protected Owner controls
Maya cannot approve brand/platform profiles, set or change ad budgets, spend money, purchase media, activate or launch campaigns, boost posts, publish externally, alter OAuth credentials, or bypass Owner/Admin approval.

## Live blockers as of B037 staging
- ALLSHIELD primary brand profile is not yet approved and contains zero approved facts.
- Maya runtime has no OPENAI_API_KEY.
- Maya runtime has no durable video provider gateway configured.
- No Meta Ads, Google Ads, TikTok Ads, or LinkedIn Ads account credentials are configured for Maya.
- Existing social publishing connections are separate from paid-media account authorization.

## Video durability decision
OpenAI's Sora API is intentionally not used by B037 because the current API reference schedules permanent shutdown on 2026-09-24. B037 uses a provider-agnostic server-side video gateway contract so the durable provider can be swapped without changing Maya's approval or spend boundaries.

## Promotion rule
Do not mark B037 certified or merge to main until approved brand facts, creative provider, durable video provider, and at least one paid-media account connection have been verified through real live work. The Owner remains responsible for budget and activation.
