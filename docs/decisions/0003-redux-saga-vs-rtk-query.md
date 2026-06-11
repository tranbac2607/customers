# ADR 0003 — Redux Saga vs RTK Query

## Status

Accepted (2026-06-11)

## Context

The assignment explicitly mentions Redux Saga for async API calls and putting data into the store. RTK Query is the modern alternative, and some teams prefer it.

## Decision

We use **Redux Saga** for async orchestration.

## Rationale

- **Assignment requirement** — the recruiter asked for Saga explicitly.
- **Explicit flow** — Saga effects (`call`, `put`, `takeLatest`, `delay`) read like English, making the control flow obvious to a reviewer who's never seen the codebase.
- **Easy to test** — sagas are pure generators; we can `assertSaga` them in isolation.
- **Cancellation** — `takeLatest` automatically cancels in-flight requests on re-trigger; `cancel` and `cancelled()` are first-class.
- **Race conditions** — saga effects (e.g. `all`, `race`) are first-class, so concurrent refresh-and-retry logic is straightforward.

## Consequences

### Positive
- Matches the brief.
- Reviewer can see every async interaction in one file per feature.

### Negative
- More boilerplate than RTK Query (a saga file, a slice file, a types file, an API file).
- Manual cache invalidation (we re-fetch the list on mutation success by mutating the items array — works for our simple case).

## What we would change for a larger app

For a real product with 50+ endpoints, RTK Query or TanStack Query would be more pragmatic. The combo of `createApi` + auto-generated hooks + cache tags is hard to beat for CRUD-heavy apps. But for a focused assignment showing thoughtful async control, Saga is the right call.
