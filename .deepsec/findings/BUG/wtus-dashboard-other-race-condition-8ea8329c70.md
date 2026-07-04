# [BUG] TOCTOU race condition in syncDiscordUser — read-then-conditional-write without transaction

**File:** [`src/auth.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/auth.ts#L20-L41) (lines 20, 29, 40, 41)
**Project:** wtus-dashboard
**Severity:** BUG  •  **Confidence:** medium  •  **Slug:** `other-race-condition`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The `syncDiscordUser` function (lines 20–52) performs a read-then-conditional-write pattern: it reads `onboardingStatus` and `status` from the database (line 29), computes `isOnboarded`, and then writes `onboardingStatus` and `status` conditionally (lines 40–41). If two concurrent Discord login events occur for the same user, or if a Discord login races with the onboarding completion endpoint (`/api/onboarding/complete`), the read may see stale data. Example race: (1) User completes onboarding, setting `onboardingStatus: 'verified'`, `status: 'active'`; (2) A concurrent Discord login reads the OLD state (before onboarding committed), sees `isOnboarded: false`; (3) The Discord login writes `onboardingStatus: 'pending'`, `status: 'invited'`, overwriting the completed onboarding. While the next Discord login would correct this, there's a window where the user's verified status is reverted, potentially blocking dashboard access.

## Recommendation

Use a Prisma transaction or an atomic update to eliminate the TOCTOU window. For example, compute the conditional update inside a single `prisma.$transaction` block, or use a raw SQL `UPDATE ... SET status = CASE WHEN onboardingStatus = 'verified' THEN 'active' ELSE 'invited' END WHERE id = $1` to make the read-and-conditional-write atomic.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-20)
