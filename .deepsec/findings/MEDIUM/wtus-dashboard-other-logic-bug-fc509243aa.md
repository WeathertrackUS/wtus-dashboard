# [MEDIUM] Potential permission bypass via non-validated member reference

**File:** [`app/api/special-requests/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/special-requests/route.ts#L23-L36) (lines 23, 36)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `other-logic-bug`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The special request creation uses the target member's ID directly in the targetUserId field without ensuring the requester has legitimate operational reasons to target this specific member. While operators have global privileges, this could still be abused to target members who have left the organization or are in the process of leaving, creating false special request records.

## Recommendation

Consider adding business logic validation to check member status before allowing special requests, such as ensuring the target is 'active' and 'verified' (onboardingStatus == 'verified').

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-24)
