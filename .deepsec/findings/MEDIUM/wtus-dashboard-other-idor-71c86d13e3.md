# [MEDIUM] Insufficient target member validation in special request creation

**File:** [`app/api/special-requests/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/special-requests/route.ts#L23-L36) (lines 23, 36)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `other-idor`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The API accepts any memberId in the request body without validating that the target member exists, has the appropriate status for targeting, or is a legitimate member of the organization. An authenticated global operator could submit a non-existent or malicious memberId (like an admin email) to create a special request against a target that doesn't exist or shouldn't be targetable. This violates the principle of verifying target existence and legitimacy before performing operations.

## Recommendation

Add validation to ensure the target member exists in the database with appropriate status (active, verified) and is a legitimate target. Use a Zod schema refinement or a database lookup to validate member existence before creating the special request.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-24)
