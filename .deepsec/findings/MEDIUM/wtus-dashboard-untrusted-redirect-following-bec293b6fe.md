# [MEDIUM] Unsafe redirect following in SPC fetcher

**File:** [`bot/plugins/weather-alerts/sources/spc.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/bot/plugins/weather-alerts/sources/spc.ts#L20) (lines 20)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `untrusted-redirect-following`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The fetchDay1Outlook method uses default redirect following without validation. Similar to the NWS API, this could allow request redirection to malicious domains if URL parameters are compromised or server configurations are manipulated.

## Recommendation

Add { redirect: 'manual' } configuration to fetch calls and validate any redirects against expected domains. Implement URL whitelist validation before following redirects.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
