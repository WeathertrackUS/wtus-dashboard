# [BUG] Onboarding can be re-invoked by already-onboarded users to re-write profile and section memberships

**File:** [`app/api/onboarding/complete/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/onboarding/complete/route.ts#L9-L41) (lines 9, 34, 41)
**Project:** wtus-dashboard
**Severity:** BUG  •  **Confidence:** high  •  **Slug:** `other-logic-bug`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The endpoint uses `requireDiscordVerifiedUser()` (line 9) which does NOT check `onboardingStatus` or `status` — it only requires a session + Discord guild membership. An already-onboarded user with status `"active"` and `onboardingStatus: "verified"` can call this endpoint again. The transaction (lines 34-68) will: (1) overwrite their `name`, `handle`, and `discordHandle` with new values from the request body, (2) re-upsert all section memberships with whatever roles are supplied, and (3) the global role upsert is idempotent so it's safe. If an invite token is supplied, it will only succeed if the invite is still `"open"` (a `"used"` invite returns 409 at line 30), so a user cannot double-consume invites. However, the profile overwrite and section membership manipulation on already-verified users is likely unintended.

## Recommendation

Add a guard after the auth check to reject users who have already completed onboarding: `if (access.user.onboardingStatus === 'verified') return apiError('Onboarding already completed', 400);`. Alternatively, gate the section membership creation on onboarding status to only apply when the user's current status is `"pending"`.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-25)
