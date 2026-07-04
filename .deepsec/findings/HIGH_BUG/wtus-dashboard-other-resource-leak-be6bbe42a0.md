# [HIGH_BUG] Unnecessary Prisma task upsert creates orphaned local task records

**File:** [`app/api/tasks/[taskId]/comments/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/tasks/[taskId]/comments/route.ts#L295-L298) (lines 295, 298)
**Project:** wtus-dashboard
**Severity:** HIGH_BUG  •  **Confidence:** high  •  **Slug:** `other-resource-leak`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The addLeantimeTaskComment function performs an unnecessary prisma.task.upsert operation (lines 295-298) that creates or updates a local dashboard task record for every Leantime comment. This creates orphaned local task records that don't correspond to actual tasks, wasting database space and potentially causing data inconsistency. The task already exists in Leantime, and the local record should only be created when a task is synced to the dashboard, not with every comment.

## Recommendation

Remove the prisma.task.upsert call from addLeantimeTaskComment. This operation should only happen during task creation or sync from Leantime to dashboard, not on comment creation. Consider adding a check to only create local task records when needed.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
