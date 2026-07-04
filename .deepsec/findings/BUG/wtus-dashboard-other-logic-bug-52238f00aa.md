# [BUG] No assignment status transition validation — status can be reverted freely

**File:** [`app/api/live-events/[eventId]/assignments/[assignmentId]/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/live-events/[eventId]/assignments/[assignmentId]/route.ts#L36-L40) (lines 36, 40)
**Project:** wtus-dashboard
**Severity:** BUG  •  **Confidence:** high  •  **Slug:** `other-logic-bug`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The PATCH handler at line 36 allows setting the assignment status to any value in AssignmentStatusSchema (`assigned`, `active`, `paused`, `done`) regardless of the current status. There is no state machine validation, so a user could set a `done` assignment back to `active`, or an `active` assignment back to `assigned`. This could cause operational confusion — for example, a member marking their assignment as complete could have it re-opened by themselves or (if they are an operator) by anyone.

## Recommendation

Implement a status transition map that defines valid transitions (e.g., `assigned → active | paused`, `active → paused | done`, `paused → active | done`). Reject transitions that violate the map with a 400 error.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
