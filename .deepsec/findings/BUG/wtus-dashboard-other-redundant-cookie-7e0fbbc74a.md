# [BUG] Session token set in three cookies, with a duplicate __Secure- cookie in production

**File:** [`app/api/auth/callback/wtus-auth/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/auth/callback/wtus-auth/route.ts#L193-L205) (lines 193, 199, 205)
**Project:** wtus-dashboard
**Severity:** BUG  •  **Confidence:** high  •  **Slug:** `other-redundant-cookie`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

On successful authentication, the session token is written to cookies in three calls (L193-212): (1) `buildSessionCookieName(appBaseUrl)` — which returns `__Secure-next-auth.session-token` in production HTTPS, (2) `next-auth.session-token` unconditionally, and (3) `__Secure-next-auth.session-token` again inside the `if (useSecureCookie)` block. In production, this results in the `__Secure-next-auth.session-token` being set twice with the same value and identical attributes. Additionally, the non-prefixed `next-auth.session-token` is always set alongside the `__Secure-` variant. While not a direct vulnerability, having both cookie names active could cause session resolution ambiguity if the NextAuth.js library or middleware reads one name while the other is the canonical one. It also increases the Set-Cookie header size unnecessarily.

## Recommendation

Consolidate the cookie-setting logic into a single path: use `buildSessionCookieName` for the production HTTPS case and only set `next-auth.session-token` for development. Remove the redundant `if (useSecureCookie)` block that duplicates `__Secure-next-auth.session-token`. Consider which cookie name NextAuth.js session lookup actually uses and set only that one.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-21)
