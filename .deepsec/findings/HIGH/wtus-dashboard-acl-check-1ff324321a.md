# [HIGH] Missing member authorization for special requests

**File:** [`app/api/special-requests/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/special-requests/route.ts#L23-L28) (lines 23, 24, 27, 28)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `acl-check`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The special requests endpoint accepts any `memberId` from the request body and creates a special request targeting that member without verifying that the authenticated global operator has authorization to target this specific member. An attacker with global operator privileges could create special requests for any member in the system, potentially escalating privileges or causing harm. The code at line 23 calls `requireGlobalOperator()` which verifies the user has global roles, but then at line 27-28 uses the user-supplied `memberId` directly in `prisma.specialRequest.create({ targetUserId: memberId })` without checking if the operator is allowed to target this member. This could enable privilege escalation or unauthorized actions against other members.

## Recommendation

Add authorization check to verify the authenticated global operator can target the requested member. If the system allows global operators to target any member, this should be documented. Otherwise, implement a check that either limits targeting to specific sections/roles or requires additional approval. Consider adding a check like `canOperateOnMember(access, memberId)` before creating the special request.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-24)
