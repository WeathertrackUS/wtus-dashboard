## deepsec triage addendum (2026-06-29)

Additional auth-layer bugs from automated scan:

- **`syncDiscordUser` TOCTOU** (`src/auth.ts`) — read-then-conditional-write on `onboardingStatus`/`status` without a transaction. A concurrent Discord login can race with `/api/onboarding/complete` and temporarily revert a verified user to `pending`/`invited`.
- **`linkAccount` drops Discord handle** — `linkAccount` calls `syncDiscordUser(user, account)` without `profile`, so `discordHandle` is always written as `null` on account link.
- **Provider `checks: []`** — `wtus-auth` NextAuth provider disables built-in OAuth state/CSRF checks; defense relies entirely on the custom callback route (see also #82).

Recommend folding these into acceptance criteria / tests for this issue.
