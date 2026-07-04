# [HIGH] Missing rate limiting on availability endpoints

**File:** [`app/api/availability/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/availability/route.ts#L28) (lines 28)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** medium  •  **Slug:** `rate-limit-bypass`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The availability endpoint (POST /api/availability) handles sensitive user availability updates but lacks rate limiting. This allows attackers to perform denial-of-service attacks by flooding the endpoint with requests, potentially creating availability conflicts or overwhelming the database. The availability data conflicts can be weaponized to disrupt scheduling coordination and create chaos in the system by repeatedly updating overlapping windows.

## Recommendation

Implement rate limiting middleware on the availability endpoint. Use distributed rate limiting (Redis-based) to prevent bypasses and ensure consistent enforcement across multiple server instances. Set reasonable limits (e.g., 10 requests per minute per user) and monitor for abuse patterns.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
