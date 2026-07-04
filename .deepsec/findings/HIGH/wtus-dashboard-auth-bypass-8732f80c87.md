# [HIGH] Potential Authorization Bypass via memberId Parameter Manipulation

**File:** [`app/api/work-submissions/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/work-submissions/route.ts#L22-L25) (lines 22, 25)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** medium  •  **Slug:** `auth-bypass`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The endpoint processes an optional `memberId` query parameter that can be exploited to bypass the intended authorization controls. While the code appears to check authorization, there are subtle edge cases where an attacker could potentially submit work for other members, especially if there are inconsistencies in how `accessSections` vs `globalRoles` are populated or validated.

## Recommendation

Add strict validation to ensure `targetMemberId` is properly validated against the user's actual permissions. Consider removing the `memberId` parameter entirely from the schema and only allowing users to submit for themselves, or implement additional checks to ensure the requesting user has explicit permission for the target member.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
