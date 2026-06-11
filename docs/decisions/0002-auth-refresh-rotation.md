# ADR 0002 — JWT refresh-token rotation

## Status

Accepted (2026-06-11)

## Context

Standard JWT auth has two tokens:
- **Access token** — short-lived (e.g. 15 min), used to authorize every request
- **Refresh token** — long-lived (e.g. 7 days), used to mint new access tokens

A naive implementation keeps the refresh token valid until expiry. If a refresh token is stolen, an attacker can mint new access tokens for the rest of its lifetime.

## Decision

We implement **refresh token rotation with reuse detection**:

1. On login: generate a `jti` (UUID) and return a new pair of (access, refresh). Store the **SHA-256 hash** of the refresh token in `user.refreshTokens` array.
2. On `/auth/refresh`:
   - Verify the JWT signature and expiry.
   - Check the **incoming refresh token's hash** is in `user.refreshTokens`.
   - If yes: rotate. Remove the old hash, push a new hash, return a new pair.
   - If no: this is **reuse** — assume the token was stolen. Purge **all** `refreshTokens` for the user, force them to log in again.
3. On `/auth/logout`: remove the given token's hash from the array.
4. **Hashed, not raw**: even with full DB access, an attacker cannot forge refresh tokens.

## Consequences

### Positive
- Stolen refresh tokens are useful for at most one request — then the user's entire session is invalidated, alerting them.
- DB compromise doesn't leak valid tokens (we store hashes).
- Symmetric to industry best practices (Auth0, Supabase, etc.).

### Negative
- Slightly more complex than a non-rotating implementation.
- Users with multiple devices must re-login if they sign out on one — acceptable trade-off.
