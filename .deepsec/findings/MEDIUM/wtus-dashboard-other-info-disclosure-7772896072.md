# [MEDIUM] Leantime API error messages returned verbatim to authenticated clients

**File:** [`src/server/leantime.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/server/leantime.ts#L57-L46) (lines 57, 229, 46)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `other-info-disclosure`

## Owners

**Suggested assignee:** `192305193+realjwx@users.noreply.github.com` _(via last-committer)_

## Finding

The rpc() function (L57) throws errors using the raw error message from the Leantime JSON-RPC API response. fetchLeantimeTasks (L229) catches this and passes error.message into its return object. The GET handler in app/api/tasks/route.ts (L46) returns this object directly to the client via Response.json(result). An authenticated member who triggers a Leantime API failure (e.g., by querying with invalid parameters that cause a server-side error) would receive Leantime's internal error details — potentially including database error messages, internal file paths, stack traces, or configuration information. This information can aid further attacks against the Leantime instance.

## Recommendation

In fetchLeantimeTasks's catch block, return a generic error string instead of error.message. For example: `return { configured: true, tasks: [] as Task[], error: 'Leantime tasks unavailable' }`. Log the detailed error server-side for debugging.

## Recent committers (`git log`)

- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-24)
- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
