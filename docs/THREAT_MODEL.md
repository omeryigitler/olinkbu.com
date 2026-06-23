# Olinkbu Threat Model

Olinkbu is a public social media product. Treat it as an internet-facing system from day one.

## Security goals

1. Protect user identity and private saved content.
2. Prevent unauthorized writes to public social state.
3. Prevent client-side manipulation of public counters and ranking signals.
4. Prevent AI provider key exposure and uncontrolled AI spend.
5. Prevent abuse of share links, API routes, and Firestore write surfaces.
6. Keep production deploys reproducible and reviewable.

## Trust boundaries

### Browser

The browser is untrusted.

It can render UI, hold a Firebase ID token, request App Check tokens, and send user intent to protected APIs.

It must not own durable counters, premium access, ranking decisions, moderation decisions, admin fields, or direct AI provider calls.

### API routes

API routes must verify identity, App Check status, request method, payload shape, and rate limits before expensive work.

### Firestore

Firestore is the realtime data layer. Client writes must be narrow and validated. Privileged writes should move to backend/Admin SDK flows.

### AI provider

AI output is untrusted. It must be parsed, validated, bounded, and never used as an authority for access control.

## Primary abuse cases

### Fake social proof

Risk: A user repeatedly increments likes, saves, or reaction counts.

Mitigation:

- Use edge documents such as `snippets/{snippetId}/reactions/{uid}`.
- Use one save document per user per snippet.
- Generate public counters server-side.

### AI cost abuse

Risk: Automated users exhaust Gemini quota or generate high costs.

Mitigation:

- Require Firebase Auth.
- Require App Check in production.
- Rate limit by IP and user.
- Log every AI call.
- Add daily user quotas and admin kill switch.

### Token replay

Risk: A valid ID token is replayed from an unauthorized environment.

Mitigation:

- Verify Firebase ID tokens server-side.
- Add App Check token verification for custom backend routes.

### Firestore over-permission

Risk: Client writes fields that should be server-owned.

Mitigation:

- Use explicit field allowlists.
- Require ownership checks.
- Move counters, ranking, premium access, and moderation fields behind backend writes.

## Required production controls

Before serious public launch:

1. Firebase App Check monitoring mode.
2. Firebase App Check enforcement after monitoring is clean.
3. App Check verification in custom API routes.
4. Distributed rate limiting for API routes.
5. Server-owned counter aggregation.
6. Audit logs for AI, moderation, premium access, and suspicious activity.
7. Dependency scanning in CI.
8. Security headers and CSP report-only rollout.
9. Separate production, preview, and development environment variables.
10. Backup and rollback plan for Firestore rules.
