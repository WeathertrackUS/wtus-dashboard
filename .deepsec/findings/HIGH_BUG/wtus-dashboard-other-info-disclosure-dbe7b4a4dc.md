# [HIGH_BUG] Hardcoded email in User-Agent header

**File:** [`bot/plugins/weather-alerts/sources/spc.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/bot/plugins/weather-alerts/sources/spc.ts#L18) (lines 18)
**Project:** wtus-dashboard
**Severity:** HIGH_BUG  •  **Confidence:** high  •  **Slug:** `other-info-disclosure`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

Same security issue as in nws-api.ts - the hardcoded email 'team@weathertrackus.com' in the User-Agent header could be harvested for phishing or social engineering attacks.

## Recommendation

Change to a generic identifier like 'WTUS-Dashboard' to prevent email harvesting and reduce information disclosure.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
