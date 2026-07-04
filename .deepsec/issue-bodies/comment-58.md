## deepsec triage addendum (2026-06-28)

Scan flagged missing rate limits on these routes (in addition to auth/onboarding items already listed here):

- `POST /api/work-submissions`
- `POST /api/availability` (+ recurring availability routes)
- `POST /api/onboarding/invites`
- `POST /api/tasks/[taskId]/comments`
- `PATCH` member routes

Recommend explicit per-route limits or shared middleware buckets in the acceptance criteria.
