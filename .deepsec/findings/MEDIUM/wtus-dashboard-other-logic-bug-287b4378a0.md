# [MEDIUM] Potential task record creation race condition or logic error

**File:** [`app/api/tasks/[taskId]/comments/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/tasks/[taskId]/comments/route.ts#L281) (lines 281)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `other-logic-bug`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

In `addLeantimeTaskComment` function (leantime.ts line 281), there's a `prisma.task.upsert()` call that creates a local task record if it doesn't exist. This could lead to unexpected behavior where a comment is added to a non-existent task in Leantime but a local record is created in the database. This might cause data inconsistency or unexpected behavior. The upsert creates a task with `id: taskId, title: 'Leantime task ${taskId}'` but doesn't check if the task actually exists in Leantime or if the user has access to it. This could create phantom tasks in the dashboard.

## Recommendation

Add validation to check if the task actually exists in Leantime before creating a local record, or at least verify the user has permission to access this task. The upsert should only happen if the task is successfully commented on AND the user has proper authorization. Consider adding a check to fetch the task first and verify access before performing any database operations.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
