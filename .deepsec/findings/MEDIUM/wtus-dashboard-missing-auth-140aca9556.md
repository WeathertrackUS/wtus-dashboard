# [MEDIUM] Root page handler without authentication verification

**File:** [`app/page.tsx`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/page.tsx#L6) (lines 6)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `missing-auth`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The app/page.tsx file defines the root home page handler. Similar to the layout, while Next.js may handle authentication through middleware, the explicit page handler doesn't include any authentication checks. This could allow unauthorized access to the root route. However, the application design uses authentication middleware and requiresDiscordVerifiedUser() for protected routes, which provides some protection. The root page itself is primarily a server component that renders the App component, and direct authentication bypass would require circumventing the session management system.

## Recommendation

Add authentication check at the page level using requireCurrentUser() or similar permission check. Implement robust session validation to ensure only authenticated users can access the root page.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
