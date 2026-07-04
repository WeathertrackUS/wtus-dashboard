# [HIGH_BUG] Race condition in database operations without proper error handling

**File:** [`bot/plugins/alert-dispatch/index.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/bot/plugins/alert-dispatch/index.ts#L34-L35) (lines 34, 35)
**Project:** wtus-dashboard
**Severity:** HIGH_BUG  •  **Confidence:** high  •  **Slug:** `other-race-condition`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The handleWeatherAlert method performs multiple parallel Prisma queries but lacks proper error handling for each individual operation. The concurrent database calls (Promise.all) could lead to race conditions where alert processing continues even if some database operations fail. Additionally, two Prisma operations on lines 34-35 (channels and dispatchRules) are not awaited properly, which could lead to undefined behavior. This could cause partial processing, data inconsistency, or unhandled promise rejections.

## Recommendation

Ensure all Prisma operations are properly awaited with individual error handling. Implement transaction management for related operations. Add comprehensive error handling for each database call and ensure atomicity of alert processing operations.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
