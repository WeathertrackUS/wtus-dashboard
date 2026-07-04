# [MEDIUM] Insufficient authorization validation for availability updates

**File:** [`app/api/availability/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/availability/route.ts#L38-L39) (lines 38, 39)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** low  •  **Slug:** `acl-check`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

While the code checks if memberId matches userId, there is no validation that the target member actually belongs to the authenticated user. An attacker could potentially craft requests with another user's memberId, exploiting potential bypassing of authorization checks depending on how memberId is validated elsewhere in the application. The check assumes the API layer prevents unauthorized memberId usage, but this should be verified in the service layer or database.

## Recommendation

Add server-side validation to ensure the target memberId belongs to the current user by checking the database relationship. Implement this validation before any operations to guarantee the user has proper ownership of the resource they're attempting to modify.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
