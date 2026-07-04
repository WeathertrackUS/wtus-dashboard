# [BUG] Client-side optimistic state updates mask server failures across all API mutations

**File:** [`src/App.tsx`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/App.tsx#L3392-L3199) (lines 3392, 3404, 991, 1016, 1025, 1048, 3177, 3199)
**Project:** wtus-dashboard
**Severity:** BUG  •  **Confidence:** high  •  **Slug:** `other-logic-bug`

## Owners

**Suggested assignee:** `192305193+realjwx@users.noreply.github.com` _(via last-committer)_

## Finding

Every API mutation in App.tsx follows the same pattern: update local React state first (optimistic update), then make the fetch call, and only reconcile with server response on success. However, on failure (`!response.ok` or `catch {}`), the local optimistic state is never reverted. For example, in `updateTaskStatus` (L3392-3404): the task status is set locally before the PATCH, and if the PATCH fails, the stale optimistic value persists. This pattern is repeated in `editTask` (L991-1016), `addComment` (L1025-1048), `changeGlobalRole` (L2567-2578), `changeSectionRole` (L2589-2610), `addCoverage` (L2620-2643), `createInvite` (L3177-3199), and all event-related mutations. While this is a standard optimistic UI pattern, the completely empty `catch {}` blocks (no logging, no user notification) combined with the live events PATCH route being missing (see above finding) means operators may believe they've updated event state when nothing was actually saved. During active weather events, this could lead to coordination failures.

## Recommendation

Add error handling to revert optimistic updates on failure, or at minimum display a toast/notification when API calls fail. The empty `catch {}` blocks should at least log the error for debugging. Consider adding a global error boundary or notification system for API failures.

## Recent committers (`git log`)

- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-24)
- Alex Miller <alex.miller.6464@gmail.com> (2026-06-24)
