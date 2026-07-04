## deepsec triage addendum (2026-06-28)

Confirmed today: `POST /api/tasks/[taskId]/comments` only calls `requireCurrentUser()` — any authenticated user can add a comment to any `taskId` with no section/task authorization check before `addLeantimeTaskComment()`.

Please ensure the "Unauthorized users cannot comment on out-of-scope tasks" acceptance criterion explicitly covers arbitrary `taskId` injection, not just attribution/idempotency.
