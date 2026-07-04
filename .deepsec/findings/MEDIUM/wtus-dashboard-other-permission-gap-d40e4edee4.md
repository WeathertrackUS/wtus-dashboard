# [MEDIUM] Missing target member existence and status validation

**File:** [`app/api/special-requests/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/special-requests/route.ts#L23-L36) (lines 23, 36)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `other-permission-gap`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The code creates a special request without first verifying that the target member exists and has a status that permits being targeted for special requests. The target member could be 'inactive', 'invited', or not exist in the user table. This could lead to special requests being created against invalid targets, potentially confusing users and breaking operational workflows.

## Recommendation

Before creating the special request, perform a prisma.user.findUnique() call to validate the target member's existence and check their onboardingStatus, discordServerVerified, and status fields to ensure they're eligible targets.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-24)
