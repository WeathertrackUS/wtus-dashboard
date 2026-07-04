# [MEDIUM] No rate limiting on comment creation endpoint

**File:** [`app/api/tasks/[taskId]/comments/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/tasks/[taskId]/comments/route.ts#L1-L18) (lines 1, 18)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `rate-limit-bypass`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The POST /api/tasks/[taskId]/comments endpoint accepts unlimited comments without any rate limiting. This could lead to comment spam, DoS through excessive database operations, or abuse by authenticated users. The endpoint is sensitive as it's modifying user data on the external Leantime system and creating local records.

## Recommendation

Implement rate limiting middleware. Should have both request-based rate limiting (e.g., max comments per minute) and per-task rate limiting to prevent spam on specific tasks. Consider using Redis-based rate limiting for distributed systems.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
