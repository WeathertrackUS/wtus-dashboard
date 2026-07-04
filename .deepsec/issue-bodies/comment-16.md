## deepsec triage addendum (2026-06-29)

Scan flagged **handle impersonation risk**: `handle` has no uniqueness constraint in Prisma, and `PATCH /api/members/[memberId]` allows any member to set their handle to match another member's (e.g. an owner or ops lead). Privilege checks still use `id`, but handles are used for team identification — enabling social-engineering confusion during live ops.

Recommend adding `@@unique([handle])` (case-normalized) or server-side collision checks in the PATCH handler.
