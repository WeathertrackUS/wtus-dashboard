# [MEDIUM] Missing task-level authorization for comment creation

**File:** [`app/api/tasks/[taskId]/comments/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/tasks/[taskId]/comments/route.ts#L7-L17) (lines 7, 15, 17)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `acl-check`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The endpoint authenticates the user but doesn't verify if the authenticated user has permission to comment on the specific task. Any authenticated user could add comments to any task, including those they don't have access to. The code calls requireCurrentUser() for authentication but never checks if the user is assigned to the task, is a team member in the same section, or has appropriate permissions. The task system appears to be section-based, and users should only be able to comment on tasks within their sections or projects they have access to.

## Recommendation

Add authorization check before processing the comment. Should verify that the user either is a global operator/owner, can work in the task's section, or is assigned to the task. Look at the task's section membership and compare with the user's access using canWorkInSection() or similar permission check.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
