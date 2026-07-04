# [HIGH] Missing authorization for task comment creation

**File:** [`app/api/tasks/[taskId]/comments/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/tasks/[taskId]/comments/route.ts#L6-L15) (lines 6, 15)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `acl-check`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The task comment endpoint at line 6 creates a comment for any taskId without verifying that the authenticated user has permission to comment on that specific task. The function `addLeantimeTaskComment(taskId, parsed.data.body.trim())` at line 15 directly uses the route parameter `taskId` without any authorization check. This allows any authenticated user to add comments to any task in the system, bypassing the intended authorization checks. This could enable unauthorized information tampering, harassment, or disruption of task workflows. The endpoint only checks that the user is authenticated via `requireCurrentUser()`, but doesn't verify if the user has access to this specific task (either through assignment, section membership, or other permissions).

## Recommendation

Add authorization check before creating a comment. The user should be verified to have access to the target task. This could be done by checking if the task belongs to a section the user has access to, if the user is an assignee, or if the user has appropriate global/section permissions. Look at the `canWorkInSection` function in permissions.ts and use it to verify section access. The Leantime module should include task metadata that would allow this check.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
