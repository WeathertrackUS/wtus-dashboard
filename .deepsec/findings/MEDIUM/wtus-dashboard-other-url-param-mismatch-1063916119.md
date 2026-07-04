# [MEDIUM] URL eventId parameter is ignored — assignment accessible via any event URL

**File:** [`app/api/live-events/[eventId]/assignments/[assignmentId]/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/live-events/[eventId]/assignments/[assignmentId]/route.ts#L14-L26) (lines 14, 26)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `other-url-param-mismatch`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The PATCH handler destructures only `assignmentId` from the route params and ignores `eventId` entirely. The database lookup at line 26 queries by assignment ID alone, with no constraint tying the assignment to the event in the URL. This means any valid assignment can be accessed and modified via any event's URL path (e.g., an assignment belonging to event A can be reached via `/api/live-events/B/assignments/<id>`). While the authorization check (ownership or operator status) still applies, this breaks the intended URL-based resource scoping. An attacker who discovers an assignment ID from one event can probe it against other event URLs to enumerate which events it belongs to (the response includes no event info, but the 403/200 difference reveals validity), and it creates a confusing API surface where the URL structure doesn't match the data model.

## Recommendation

Either (a) add `eventId` to the Prisma where clause to constrain the lookup (`where: { id: assignmentId, liveEventId: eventId }`), or (b) remove `eventId` from the route segment if it's not needed. Option (a) is preferred as it enforces event-scoped access at the data layer.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
