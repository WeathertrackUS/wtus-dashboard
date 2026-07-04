# [HIGH_BUG] Hardcoded email in User-Agent header

**File:** [`bot/plugins/weather-alerts/sources/nws-api.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/bot/plugins/weather-alerts/sources/nws-api.ts#L19) (lines 19)
**Project:** wtus-dashboard
**Severity:** HIGH_BUG  •  **Confidence:** high  •  **Slug:** `other-info-disclosure`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The User-Agent header contains a hardcoded email address 'team@weathertrackus.com' which could be used for email harvesting or targeted attacks. This represents unnecessary information disclosure about internal team structure.

## Recommendation

Replace the specific email with a generic team identifier or remove the email from headers entirely. Use 'WTUS-Dashboard' instead of '(WTUS Dashboard, team@weathertrackus.com)'.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
