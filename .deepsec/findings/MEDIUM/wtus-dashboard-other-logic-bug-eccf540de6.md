# [MEDIUM] Missing type guard on `memberId` enables potential reference errors

**File:** [`app/api/reminder-preferences/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/reminder-preferences/route.ts#L39) (lines 39)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `other-logic-bug`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The pattern `const targetMemberId = memberId || access.access.userId;` is unsafe because `memberId` could be an empty string `''`, which is falsy and would incorrectly fall back to `access.access.userId`. This would allow an attacker to send `memberId: ""` to edit their own reminders instead of the intended target (if targetMemberId was somehow derived from a falsy but valid value). While the schema defines `memberId` as `OptionalStringSchema` (which allows empty strings), this logic bug doesn't affect security since the subsequent `canEditTarget` check still restricts editing to own reminders or global operators.

## Recommendation

Validate that `memberId` is either `null`, `undefined`, or a valid non-empty string before using it. Use explicit check: `if (memberId != null && memberId !== '')`. Better yet, update the schema to reject empty strings if they shouldn't be allowed.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
