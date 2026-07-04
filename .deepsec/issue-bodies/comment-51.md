## deepsec triage addendum (2026-06-28)

Automated scan surfaced additional onboarding gaps aligned with this issue:

- **Re-invocation by verified users** — `POST /api/onboarding/complete` does not reject users with `onboardingStatus: "verified"`; profile + section memberships can be overwritten.
- **Self-assigned section lead** — request body accepts `role: "lead"` per section; stored directly in `sectionMembership.upsert` without invite-based validation.
- **Client render order** — `OnboardingPage` renders from hash token before auth gate; unauthenticated users see onboarding UI shell (submit disabled, but invite existence leaks).

Recommend folding these into acceptance criteria / tests for this P0.
