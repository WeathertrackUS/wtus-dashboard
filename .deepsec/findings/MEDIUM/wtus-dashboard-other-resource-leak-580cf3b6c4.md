# [MEDIUM] No validation of task existence in target system

**File:** [`app/api/tasks/[taskId]/comments/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/tasks/[taskId]/comments/route.ts#L287-L293) (lines 287, 293)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `other-resource-leak`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The addLeantimeTaskComment function directly calls Leantime RPC without verifying that the taskId exists in the Leantime system first. This could lead to API errors or silent failures. The Leantime API might validate this, but it's not explicitly checked.

## Recommendation

Add validation before attempting to add a comment. Could either pre-validate with Leantime's tickets.getTicket endpoint, or catch and handle API errors more gracefully.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
