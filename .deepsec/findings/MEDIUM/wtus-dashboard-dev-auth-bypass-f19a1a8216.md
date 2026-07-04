# [MEDIUM] OnboardingPage accessible before auth gate check in render order

**File:** [`src/App.tsx`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/App.tsx#L3356-L2338) (lines 3356, 3470, 3471, 2276, 2338)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `dev-auth-bypass`

## Owners

**Suggested assignee:** `192305193+realjwx@users.noreply.github.com` _(via last-committer)_

## Finding

In the `App()` component's render flow, the onboarding token check at L3470 (`if (onboardingToken) { return <OnboardingPage ... />; }`) executes BEFORE the authentication gate checks at L3474-3482. The `onboardingToken` is parsed from `window.location.hash` (L3356: `hash.match(/^#\/onboard\/([^/]+)$/)?.[1]`), and the matching invite is looked up from client-side state. An unauthenticated user who navigates to `/#/onboard/<token>` (with a valid or even invalid token) will render the `OnboardingPage` component, which displays the onboarding form UI including name/handle inputs and team selection checkboxes. While the form's submit button is correctly disabled when not authenticated (L2338: `disabled={!isSignedIn || !discordVerified || submitState === 'saving'}`), the page still renders visible form fields and the invite status to unauthenticated users. For invalid tokens, the page shows 'sign in' status with a Discord login button, leaking that onboarding invite links exist.

## Recommendation

Move the onboardingToken check after the authentication gate checks, or add an authentication guard within the onboarding token branch that redirects unauthenticated users to the auth gate before rendering the onboarding page.

## Recent committers (`git log`)

- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-24)
- Alex Miller <alex.miller.6464@gmail.com> (2026-06-24)
