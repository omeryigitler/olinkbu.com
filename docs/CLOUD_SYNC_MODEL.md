# Olinkbu Cloud Sync Model

This phase replaces local-only social state with Firestore edge documents.

## Goals

- Saved snippets must follow the user across devices.
- Reactions must be one record per user per snippet.
- Taste signals must be append-only so future recommendation jobs have reliable inputs.
- Public counters must not be blindly written by the browser.

## Collections

### users/{uid}/saves/{snippetId}

A private save edge for the signed-in user.

Fields:

- userId
- snippetId
- ownerId
- category
- platform
- createdAt

### snippets/{snippetId}/reactions/{uid}

A public reaction edge. One user has one current reaction per snippet.

Fields:

- userId
- reactionType
- category
- platform
- createdAt
- updatedAt

### users/{uid}/tasteEvents/{eventId}

Append-only taste signal ledger.

Fields:

- userId
- type
- snippetId
- reactionType
- category
- platform
- createdAt

## Counter policy

The browser should not directly control durable public counters.

Current phase:

- Writes save and reaction edges.
- Preserves existing UI counts where available.
- Logs taste events for future ranking.

Next phase:

- Add backend aggregation for `counts.saves`, `counts.reactions`, and `counts.comments`.
- Move snippet creation into a protected backend route so canonical fields are server-owned.
- Add distributed rate limiting for reaction/save abuse.

## Why edge documents

Edge documents make spam and duplicates easier to control:

- Save ID is the snippet ID, so the same user cannot create infinite saves for one snippet.
- Reaction ID is the user ID, so the same user cannot create infinite reaction documents for one snippet.
- Taste events are append-only and private to the user, so they can be processed later without affecting public state.
