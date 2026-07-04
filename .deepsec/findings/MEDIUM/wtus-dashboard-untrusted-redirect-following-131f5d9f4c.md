# [MEDIUM] Unsafe redirect following in NWS API fetcher

**File:** [`bot/plugins/weather-alerts/sources/nws-api.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/bot/plugins/weather-alerts/sources/nws-api.ts#L34) (lines 34)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `untrusted-redirect-following`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The fetch call in poll() method uses default redirect following, potentially redirecting requests to malicious domains. An attacker could manipulate URL parameters or server configurations to force redirects to other servers that could serve malicious content or collect data.

## Recommendation

Add { redirect: 'manual' } or explicit redirect validation before following any redirects. Verify redirect destinations against a whitelist or confirm they match expected domains.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
