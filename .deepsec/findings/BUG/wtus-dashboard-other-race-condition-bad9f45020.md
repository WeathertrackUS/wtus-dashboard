# [BUG] Lost-update race condition when operators modify sections simultaneously

**File:** [`app/api/members/[memberId]/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/members/[memberId]/route.ts#L81-L92) (lines 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92)
**Project:** wtus-dashboard
**Severity:** BUG  •  **Confidence:** high  •  **Slug:** `other-race-condition`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

When an operator sends the `sections` array (lines 81-92), the handler performs `deleteMany` followed by individual `upsert` calls within a Prisma transaction. If two operators simultaneously PATCH the same member's sections, the second request's `deleteMany` removes the sections inserted by the first request's transaction. The first operator's changes are silently lost. This is a classic lost-update problem: each transaction sees a snapshot at the start and the `deleteMany` wipes out concurrent inserts. The same issue exists for the `section`+`sectionRole` path (lines 68-79) if two operators race to modify the same section membership, though the `upsert` there is less likely to cause data loss. This can lead to incorrect section assignments for members, potentially affecting their access to section-scoped data.

## Recommendation

Either (a) use a database-level advisory lock on the member ID before modifying sections, or (b) use a compare-and-swap pattern where the final write only succeeds if the section membership count hasn't changed since the read, or (c) redesign the sections update to use additive/removal operations instead of delete-all-and-reinsert.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
