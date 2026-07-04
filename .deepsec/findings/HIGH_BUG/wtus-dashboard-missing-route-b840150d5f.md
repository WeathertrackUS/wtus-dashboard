# [HIGH_BUG] Missing server route for live event PATCH operations causes silent data loss

**File:** [`src/App.tsx`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/App.tsx#L1951-L1991) (lines 1951, 1959, 1963, 1989, 1991)
**Project:** wtus-dashboard
**Severity:** HIGH_BUG  •  **Confidence:** high  •  **Slug:** `missing-route`

## Owners

**Suggested assignee:** `192305193+realjwx@users.noreply.github.com` _(via last-committer)_

## Finding

The client makes PATCH requests to `/api/live-events/${eventId}` for two critical operations: (1) updating event name, description, and briefing (L1951-1959 in `saveEventUpdate`), and (2) posting team/event updates (L1989-1991 in `postUpdate`). However, no `app/api/live-events/[eventId]/route.ts` file exists. The `find` search for `app/api/live-events/**/route.ts` only returns `route.ts` (POST-only for creation) and `assignments/` sub-routes. Next.js returns 404 for the PATCH requests. In `saveEventUpdate`, the `if (response.ok)` check at L1963 means the event falls back to the local-only copy, so the operator sees the change but it's never persisted. In `postUpdate` at L1991, the update is added to local state but silently lost. This means live event coordination updates during active severe weather events are not saved, which could cause coordination failures during critical operations.

## Recommendation

Create `app/api/live-events/[eventId]/route.ts` with PATCH and DELETE handlers. The PATCH handler should require `requireGlobalOperator()` (consistent with the POST route) and update event name, description, briefing, and handle the update-posting action. Validate input with the existing Zod schemas.

## Recent committers (`git log`)

- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-24)
- Alex Miller <alex.miller.6464@gmail.com> (2026-06-24)
