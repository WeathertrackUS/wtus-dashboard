## deepsec triage addendum (2026-06-29) — additional

Beyond missing task-level ACL (prior comment):

- **`userId` not stored** — `addLeantimeTaskComment` in `src/server/leantime.ts` creates `TaskComment` without `userId`, breaking attribution/audit trail even when the comment is authorized.
- **Orphan task upsert** — same function upserts a placeholder `Task` record (`title: "Leantime task ${taskId}"`) for any `taskId`, which can create orphaned local rows for arbitrary IDs.

Both should be covered in the comment API fix.
