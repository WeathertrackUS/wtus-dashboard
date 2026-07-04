# [MEDIUM] Potential information disclosure in special request response

**File:** [`app/api/special-requests/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/special-requests/route.ts#L8-L37) (lines 8, 37)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `other-info-disclosure`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The special request endpoint returns the full special request object including `memberId` (line 8, line 37). This could expose sensitive information about targeted members to operators. While operators may need this data for their role, it's worth ensuring proper access controls are in place and that the response format doesn't inadvertently expose other sensitive fields. Need to verify if this is expected behavior for operators or if additional protection is needed.

## Recommendation

Review the special request response format to ensure it only exposes necessary fields. Consider sanitizing the response or adding additional authorization checks before returning sensitive member data. Verify if operators at different permission levels should have access to this information.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-24)
