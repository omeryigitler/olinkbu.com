# Olinkbu Security and Environment Strategy

Olinkbu must treat AI, identity, recommendations, and paid features as backend-controlled systems. The frontend should stay a thin client.

## Non-negotiable rules

1. Do not put Gemini, payment, admin, or moderation credentials in frontend code.
2. Do not expose server secrets through Vite `define` or any `VITE_` variable.
3. All paid or expensive operations must pass through server-side API routes.
4. All AI routes must require Firebase Authentication.
5. All AI routes must have rate limits before the provider request is made.
6. Firestore writes must be validated by rules and, for privileged operations, by backend code.

## Environment variable classes

### Server-only variables

These belong only in Vercel Project Settings under server/runtime environment variables:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `FIREBASE_PROJECT_ID`
- future payment provider secrets
- future webhook signing secrets

### Public browser variables

Only values intentionally safe for browser delivery may use the `VITE_` prefix:

- `VITE_FIREBASE_APPCHECK_SITE_KEY`

A public App Check site key is not a replacement for backend verification or Firebase enforcement.

## Current server protection

The `/api/analyze-snippet` endpoint is designed for expensive AI classification work.

It currently has:

- Firebase ID token verification using Google's public Firebase Auth certificates.
- Per-IP rate limiting.
- Per-user daily AI limiting.
- Server-only Gemini access.
- Structured JSON output validation before returning data to the client.

## Production hardening backlog

Before heavy launch traffic, add these controls:

1. Firebase App Check enforcement for Firestore and API requests.
2. Backend App Check token verification for custom API routes.
3. Redis or Vercel KV backed rate limiting instead of in-memory buckets.
4. Abuse monitoring and alerting for AI spend spikes.
5. Audit log documents for AI calls, moderation decisions, and premium actions.
6. Budget alerts in Google Cloud and provider dashboards.
7. Separate restricted Gemini key for production.
