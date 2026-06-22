# Olinkbu

Olinkbu is a taste-driven media identity platform for saving, classifying, organizing, and sharing meaningful media moments.

The product direction is not a simple video clipping utility. The long-term platform is built around:

- Taste DNA
- Curated collections
- Social proof and discovery
- Cloud-synced saves and reactions
- AI-assisted moment classification
- Shareable exact-moment links and cards

## Run locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run build
```

## Environment strategy

Server-only credentials must stay out of the browser bundle.

- Keep AI provider keys in server/runtime environment variables.
- Do not expose AI provider keys through Vite `define` or `VITE_*` variables.
- Only intentionally public browser values should use the `VITE_` prefix.

See:

- `docs/SECURITY_AND_ENV.md`
- `docs/PRODUCT_ARCHITECTURE.md`
- `docs/CLOUD_SYNC_MODEL.md`

## Cloud sync

Cloud-synced social state uses Firestore edge documents:

- `users/{uid}/saves/{snippetId}`
- `snippets/{snippetId}/reactions/{uid}`
- `users/{uid}/tasteEvents/{eventId}`

This prevents local-only state from becoming the product source of truth and prepares the platform for future recommendation and ranking jobs.
