## deepsec triage addendum (2026-06-29)

Two live-event assignment API gaps from automated scan:

1. **URL `eventId` ignored** — `PATCH /api/live-events/[eventId]/assignments/[assignmentId]` looks up by `assignmentId` only; the `eventId` path segment is not enforced in the Prisma `where` clause. Prefer `where: { id: assignmentId, liveEventId: eventId }`.
2. **No status transition validation** — PATCH accepts any `AssignmentStatusSchema` value regardless of current status (e.g. `done` → `active`), with no state machine.

Recommend explicit acceptance criteria for event-scoped URLs and valid status transitions.
