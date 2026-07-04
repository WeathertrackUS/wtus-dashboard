# [HIGH] Race condition in reminder preference upsert allows simultaneous write races

**File:** [`app/api/reminder-preferences/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/reminder-preferences/route.ts#L49-L79) (lines 49, 79)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `acl-check`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The endpoint performs `prisma.reminderPreference.upsert()` without transaction isolation or locking, allowing concurrent writes from multiple concurrent requests targeting the same `userId`. This creates a race condition where last-write-wins semantics could cause data corruption, especially when conflicting updates to arrays like `preferredDays` or `preferredTimes`. While not directly a security vulnerability, this could lead to data integrity issues and user frustration through lost updates.

## Recommendation

Wrap the upsert operation in a database transaction with appropriate locking (e.g., `prisma.$transaction([...])` or use a skip-lock mode) to ensure atomicity. Alternatively, implement application-level optimistic locking with versioning if concurrent updates are expected.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
