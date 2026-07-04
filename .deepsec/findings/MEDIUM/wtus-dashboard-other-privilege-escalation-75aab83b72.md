# [MEDIUM] New user can self-assign section lead role during onboarding

**File:** [`app/api/onboarding/complete/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/onboarding/complete/route.ts#L43-L50) (lines 43, 50)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `other-privilege-escalation`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The CompleteOnboardingSchema (schemas.ts L168-175) accepts `role: SectionRoleSchema` which allows both `"lead"` and `"member"`. The transaction at lines 43-50 uses the user-supplied role directly: `role: membership?.role ?? "member"`. A Discord-verified user completing onboarding can set themselves as `"lead"` in any section(s) they choose, including sections they have no legitimate claim to. While the global role is correctly restricted to `"member"` (hardcoded at line 33), the section role escalation is unchecked. This grants the new user section-level lead privileges (the specific capabilities depend on how `canWorkInSection` and section role checks are applied elsewhere in the app). The `canWorkInSection` function exists in permissions.ts but is currently unused in any API route, suggesting section-scoped authorization may be partially implemented.

## Recommendation

Optionally restrict the section role during onboarding to `"member"` only, and let operators promote to `"lead"` later. If self-assignment is intentional, add a flag or config to control whether `"lead"` is allowed during onboarding, or validate that the user was invited by someone with authority over the selected section (the invite's `createdBy` roles are already fetched at line 23 but not used for this validation).

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-25)
