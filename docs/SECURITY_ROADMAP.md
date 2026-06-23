# Security Hardening Roadmap

This roadmap turns the current foundation into a serious production system.

## Phase 1: Baseline controls

Status: in progress.

- Security headers in Vercel.
- CSP report-only rollout.
- API no-store headers.
- CI on stacked branches.
- Threat model.
- Production checklist.

## Phase 2: App Check and API verification

- Enable Firebase App Check in monitoring mode.
- Add client App Check token attachment for API calls.
- Verify App Check token in every protected API route.
- Enforce App Check after monitoring confirms legitimate traffic.

## Phase 3: Server-owned writes

- Move snippet creation to a protected API route.
- Move reaction and save mutations to protected API routes.
- Keep Firestore client writes only for low-risk user-owned data.
- Introduce backend-owned canonical fields.

## Phase 4: Counter aggregation

- Derive public counts from edge documents.
- Do not let browser clients update durable counters.
- Add sharded counters or a server aggregation job when volume grows.

## Phase 5: Distributed limits and audit logs

- Replace in-memory rate limits with a shared durable store.
- Log AI calls, moderation actions, and suspicious events.
- Add alerting for traffic spikes and AI spend spikes.

## Phase 6: Moderation and trust

- Add report flow.
- Add moderation queue.
- Add blocked user and hidden content model.
- Add admin-only review actions.

## Phase 7: Production operations

- Separate production, preview, and development environment variables.
- Maintain rollback plan for rules and API changes.
- Add periodic dependency audits.
- Add backup/export procedure for Firestore.
