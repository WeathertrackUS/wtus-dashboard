# [HIGH_BUG] Comment association with user missing

**File:** [`app/api/tasks/[taskId]/comments/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/tasks/[taskId]/comments/route.ts#L310-L299) (lines 310, 299)
**Project:** wtus-dashboard
**Severity:** HIGH_BUG  •  **Confidence:** high  •  **Slug:** `other-logic-bug`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The addLeantimeTaskComment creates a TaskComment record but doesn't set the userId field. This means comments created through this API will not be associated with the authenticated user, breaking audit trails and accountability. Line 310 (userId: comment.userId ?? undefined) suggests userId should be set but is left as undefined because the Prisma create doesn't include it in the data.

## Recommendation

Fix the addLeantimeTaskComment function in src/server/leantime.ts to include userId: access.userId when creating the TaskComment. Also ensure the comment creation is properly transactioned to maintain consistency.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
