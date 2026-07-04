# [MEDIUM] NEXT_PUBLIC_ENABLE_LOCAL_PREVIEW bypasses all client-side authentication when enabled

**File:** [`src/App.tsx`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/App.tsx#L70-L523) (lines 70, 3329, 3330, 3459, 3461, 523)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `dev-auth-bypass`

## Owners

**Suggested assignee:** `192305193+realjwx@users.noreply.github.com` _(via last-committer)_

## Finding

The `NEXT_PUBLIC_ENABLE_LOCAL_PREVIEW` env var is a public client-side variable (bundled into JavaScript). When set to 'true', `isDevelopmentFallback` becomes true for unauthenticated users (L70, L3329). This bypasses ALL client-side auth gates: the `ProductionAuthGate` at L3474, the Discord verification check at L3478, and the onboarding status check at L3482. When `isDevelopmentFallback` is true, `effectiveRole` is sourced from `localStorage` (L3330: `const effectiveRole = isDevelopmentFallback ? role : roleFromSession(session?.user?.globalRoles)`), allowing any unauthenticated visitor to select 'owner' role from the sidebar role switcher (L523). This grants full client-side navigation including Discord bot config (L3459: `if (active === 'discord' && canManageTeam(effectiveRole))`) and admin views (L3461). While API routes enforce server-side auth (requiring actual sessions), the full dashboard UI renders with cached `localStorage` data, and a role selector allows claiming any privilege level client-side. If this env var is accidentally enabled in production, unauthenticated users gain full dashboard visibility from cached state. The env var value is also visible to anyone inspecting the client bundle.

## Recommendation

1. Remove NEXT_PUBLIC_ prefix if this flag should not be client-visible, or ensure it is never set in production builds. 2. Add a server-side runtime check (e.g., in middleware or the dashboard API route) that rejects requests when this mode is active in production. 3. Consider using a separate build target for local preview rather than a runtime flag. 4. Audit deployment pipelines to ensure this variable is never set to 'true' in production environments.

## Recent committers (`git log`)

- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-24)
- Alex Miller <alex.miller.6464@gmail.com> (2026-06-24)
