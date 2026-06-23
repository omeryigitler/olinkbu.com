# Olinkbu Product Architecture

## Direction

Olinkbu should be treated as a taste-driven media identity platform, not as a simple video clipping tool.

The main user loop is:

1. Capture a meaningful media moment.
2. Add a curator note.
3. Analyze the note and media context.
4. Attach a Taste DNA label.
5. Save the moment into collections.
6. Share a high quality moment card.
7. Bring new users back to the exact second of the original media.

## Product pillars

### Taste Identity

Profiles should show what a person repeatedly notices, saves, and shares.

Examples:

- Deep Thinker
- Music Hunter
- Cinema Eye
- Chaos Energy
- Motivation Collector

### Curated Collections

Collections should become public identity objects, not just private bookmarks.

Examples:

- Moments that changed my thinking
- Final scenes worth rewatching
- Gym motivation cuts
- Songs with perfect 30-second emotional peaks

### Social Graph

The follow system should support two feeds:

- Home feed: ranked global discovery.
- Following feed: only people the user follows.

### Taste Graph

Each save, reaction, follow, and collection add should become a taste signal.

These signals can later power:

- Similar curator suggestions.
- Opposite taste discovery.
- Vibe search.
- Weekly challenges.

## Backend-first rule

The browser should render the product and collect user intent. Expensive, trusted, or identity-shaping work should happen behind server routes.

Server-owned work:

- AI classification.
- Taste DNA scoring.
- Short link creation.
- Counter updates.
- Premium access checks.
- Recommendation jobs.
- Share card generation.

Browser-owned work:

- UI rendering.
- Auth state.
- Form input.
- Preview interactions.
- Calling protected API routes.

## Suggested Firestore model

### users/{uid}

Stores public profile and computed taste state.

### snippets/{snippetId}

Stores canonical media moments.

### snippets/{snippetId}/reactions/{uid}

One user can have one reaction record per snippet.

### users/{uid}/saves/{snippetId}

One user can save one snippet once.

### collections/{collectionId}

Stores playlist-like boards.

### collections/{collectionId}/items/{snippetId}

Stores collection membership and ordering.

### follows/{followerId_followingId}

Stores follow edges.

### users/{uid}/tasteEvents/{eventId}

Append-only taste signal log for future recommendations.

## AI flow

1. Client collects the curator note.
2. Client sends an authenticated request to the server AI route.
3. Server verifies the user.
4. Server applies request limits.
5. Server calls the model provider.
6. Server validates the structured JSON result.
7. Client shows the suggested DNA, category, mood tags, golden quote, and share hook.
8. Snippet creation uses validated values.

## Roadmap order

1. Real save and reaction model.
2. User profile documents.
3. AI Taste DNA endpoint.
4. Collection documents.
5. Follow graph.
6. Following feed.
7. Similar curator module.
8. Share card engine.
9. Short link system.
10. Vibe search.
