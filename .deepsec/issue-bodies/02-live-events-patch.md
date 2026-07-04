## Summary

deepsec confirmed a **HIGH_BUG**: the client PATCHes `/api/live-events/${eventId}` for event edits and team updates, but no `app/api/live-events/[eventId]/route.ts` exists. Next.js returns 404 and the UI keeps optimistic local state, so operators can believe live-event coordination was saved during active weather when it was not.

## Affected client paths

- `saveEventUpdate` in `src/App.tsx` — name/description/briefing updates
- `postUpdate` in `src/App.tsx` — team/event update posts

## Required changes

- Add `app/api/live-events/[eventId]/route.ts` with `PATCH` (and any needed `DELETE`) handlers.
- Require `requireGlobalOperator()` consistent with event creation.
- Validate input with existing Zod schemas.
- Return errors the client can surface; do not silently accept local-only state.

## Acceptance criteria

- [ ] PATCH persists event metadata and update posts to the database.
- [ ] Unauthorized users receive 403.
- [ ] Failed PATCH does not leave irreversible optimistic UI state (see related optimistic-UI issue).
- [ ] API/integration tests cover success, 404, and auth failure.

## Source

Automated deepsec scan (`missing-route`). Confirmed missing route in repo layout.
