## deepsec triage addendum (2026-06-29)

`POST /api/special-requests` accepts any `memberId` without verifying the target user exists or has an eligible status (`verified`/`active`). Operators could create requests against non-existent or inactive targets.

Recommend `prisma.user.findUnique` + status checks before `specialRequest.create`.
