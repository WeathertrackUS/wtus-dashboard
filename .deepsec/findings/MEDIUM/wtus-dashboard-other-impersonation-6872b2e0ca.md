# [MEDIUM] Non-unique handle field enables member impersonation

**File:** [`app/api/members/[memberId]/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/members/[memberId]/route.ts#L57) (lines 57)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `other-impersonation`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The `handle` field has no uniqueness constraint in the Prisma schema, and the PATCH handler allows any authenticated operator or the user themselves to set their handle to any value. A non-operator can change their own handle to exactly match an owner's or operations lead's handle, enabling social engineering attacks. In a coordination app where team members identify each other by handle, this allows an attacker to impersonate leadership — issuing fake directives, causing confusion about who approved an action, or tricking other members into sharing operational information. The attack requires: (1) a verified, onboarded account, (2) knowledge of the target's handle, and (3) other members relying on handles for identity. The `id` field remains unique and is used for all privilege checks, so privilege escalation is not possible, but social engineering within the organization is.

## Recommendation

Add a uniqueness constraint on the `handle` field in the Prisma schema (`@@unique([handle])` with a case-insensitive constraint or application-level normalization). Alternatively, validate in the PATCH handler that the new handle does not match any existing member's handle before applying the update. Consider also adding a length cap (e.g., 32 characters).

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
