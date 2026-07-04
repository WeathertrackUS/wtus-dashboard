# [HIGH] Sensitive environment variables exposed in source code

**File:** [`src/lib/oidc.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/lib/oidc.ts#L15-L24) (lines 15, 19, 20, 24)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `secrets-exposure`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The OIDC configuration directly exposes sensitive environment variables to a JavaScript context including OIDC_ISSUER_URL, WTUS_DASHBOARD_OIDC_CLIENT_SECRET, AUTH_SECRET, and APP_URL. These secrets are accessible to client-side code and could be exposed through various attack vectors including debugging interfaces, build artifacts, or memory inspection.

## Recommendation

Move OIDC configuration values to server-only environment variables and ensure they're not accessible from client bundles. Use Next.js runtime environment variables (NEXT_PUBLIC_ prefix for public values only). For secrets like client secrets, use environment variables that are explicitly excluded from client-side bundles.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-21)
