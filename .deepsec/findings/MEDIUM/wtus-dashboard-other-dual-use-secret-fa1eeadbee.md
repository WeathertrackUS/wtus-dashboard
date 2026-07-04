# [MEDIUM] AUTH_SECRET used as both session signing key and OIDC client secret

**File:** [`src/auth.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/auth.ts#L11-L181) (lines 11, 181)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `other-dual-use-secret`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

At line 11, `wtusAuthClientSecret` falls back to `AUTH_SECRET` when `WTUS_DASHBOARD_OIDC_CLIENT_SECRET` is not set. The same `AUTH_SECRET` is also used at line 181 as the NextAuth session signing secret (`secret: process.env.AUTH_SECRET`). Additionally, `getAuthSecret()` in safe-redirect.ts uses `AUTH_SECRET` as the first-priority secret for signing OAuth state parameters. This means a single secret serves three distinct cryptographic purposes: (1) session token signing, (2) OAuth state parameter signing, and (3) OIDC client authentication. Compromise of `AUTH_SECRET` — for example, via a log leak or a separate vulnerability — would grant an attacker the ability to forge sessions, forge OAuth state, and complete OIDC token exchanges. The `getOidcConfig()` function in `src/lib/oidc.ts` (line 12) uses the same fallback chain, confirming the dual-use. Per OWASP guidelines, cryptographic keys should be purpose-separated.

## Recommendation

Set `WTUS_DASHBOARD_OIDC_CLIENT_SECRET` explicitly in production to avoid falling back to `AUTH_SECRET`. Ideally, use a dedicated environment variable for each cryptographic purpose. If only one secret is available, document the shared risk.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-20)
