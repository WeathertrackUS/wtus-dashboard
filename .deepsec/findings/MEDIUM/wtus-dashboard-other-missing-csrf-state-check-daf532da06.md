# [MEDIUM] wtus-auth NextAuth provider configured with `checks: []` — no OAuth state/CSRF protection at the provider level

**File:** [`src/auth.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/auth.ts#L98) (lines 98)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `other-missing-csrf-state-check`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The wtus-auth provider at line 98 specifies `checks: []`, meaning NextAuth will not generate, store, or verify a CSRF state parameter for this provider. The application relies entirely on the custom route at `app/api/auth/callback/wtus-auth/route.ts` to perform state verification independently via signed state cookies. While the custom route does enforce state verification (lines 77–83 of the callback route), this creates a fragile defense-in-depth situation: if the custom route is ever removed, refactored, or if a developer accidentally routes the callback through the NextAuth catch-all `[...nextauth]` handler, the OAuth flow would immediately become vulnerable to CSRF authorization code injection. An attacker could craft a link that associates their own authorization code with a victim's session. The wtus-auth provider is also reachable via NextAuth's built-in sign-in UI at `/api/auth/signin/wtus-auth`, which would generate an authorization URL without a state parameter — though the custom callback route would reject the stateless response.

## Recommendation

Change `checks: []` to at least `checks: ['state']` for the wtus-auth provider, even though the custom route handles state separately. This provides defense-in-depth: if the custom route is bypassed, NextAuth still enforces CSRF protection. Alternatively, add a comment documenting why `checks: []` is intentionally empty and what would break if the custom route is removed.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-20)
