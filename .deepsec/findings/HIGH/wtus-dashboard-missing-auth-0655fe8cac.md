# [HIGH] HTTP entry point without authentication requirements

**File:** [`app/layout.tsx`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/layout.tsx#L30) (lines 30)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** medium  •  **Slug:** `missing-auth`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

Root layout.tsx serves as the default HTTP handler for the application root. This layout includes all subsequent pages and provides the initial HTML shell. While Next.js layouts typically don't require direct authentication, this represents a potential attack surface. An attacker could directly request the root path (/), and without middleware-level authentication checks, they might bypass application-level auth. However, the application uses NextAuth session management and requiresDiscordVerifiedUser() for protected routes, which acts as protection. Still, absence of explicit auth guard at the layout level creates a weak authentication boundary that could be exploited via client-side navigation errors or direct requests.

## Recommendation

Implement middleware authentication at the layout level. Add Next.js middleware.ts to enforce authentication requirements for all routes, ensuring consistent access control across the application.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
