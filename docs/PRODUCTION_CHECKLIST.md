# Production Readiness Checklist

This checklist must be reviewed before merging deploy-bound changes.

## Code and CI

- [ ] `npm ci` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] No server secret is referenced from browser code.
- [ ] No secret is exposed through Vite `define`.
- [ ] No secret is exposed through a `VITE_` variable.
- [ ] Pull request has a clear rollback plan.

## Firebase

- [ ] Firestore rules use default deny.
- [ ] Firestore rules use explicit field allowlists.
- [ ] Client writes cannot change counters, ranking, moderation, admin, or payment fields.
- [ ] User-owned private collections are readable only by the owner.
- [ ] App Check is enabled in monitoring mode.
- [ ] App Check enforcement is enabled after monitoring is clean.
- [ ] Rules are deployed from version-controlled files, not ad hoc console edits.

## API routes

- [ ] Protected API route verifies Firebase ID token.
- [ ] Protected API route verifies App Check token in production.
- [ ] Expensive API route has rate limits before provider calls.
- [ ] API route validates request method.
- [ ] API route validates body schema.
- [ ] API route returns bounded output.
- [ ] API route logs non-sensitive audit metadata.

## App Check rollout

- [ ] Firebase Console has a registered web app provider.
- [ ] `FIREBASE_PROJECT_NUMBER` is set in Vercel.
- [ ] `FIREBASE_APPCHECK_APP_IDS` is set in Vercel.
- [ ] `APPCHECK_ENFORCEMENT_MODE` starts as `monitor`.
- [ ] Preview deployment exposes `X-App-Check-Mode: monitor`.
- [ ] Preview deployment exposes `X-App-Check-Verified` for protected API routes.
- [ ] Legitimate browser requests include `X-Firebase-AppCheck` before enforcement.
- [ ] Enforcement is changed to `enforce` only after monitoring is clean.

## AI

- [ ] AI key is server-only.
- [ ] AI output is treated as untrusted.
- [ ] AI output is schema-validated.
- [ ] AI calls have per-IP and per-user limits.
- [ ] AI calls have daily budget monitoring.
- [ ] User-facing fallback exists when AI provider fails.

## Vercel

- [ ] Production, preview, and development environment variables are separated.
- [ ] Security headers are configured.
- [ ] API responses that contain user-specific or operational data use `Cache-Control: no-store`.
- [ ] Preview deployment is tested before production merge.

## Product safety

- [ ] Abuse reporting route exists or is on the immediate backlog.
- [ ] Moderation queue exists or is on the immediate backlog.
- [ ] Public share pages do not expose private saves or private collections.
- [ ] Rate limits are documented.
- [ ] Known gaps are tracked in `docs/THREAT_MODEL.md`.
