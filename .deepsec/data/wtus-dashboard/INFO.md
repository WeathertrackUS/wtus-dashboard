# wtus-dashboard

## What this codebase does

WTUS Operations Dashboard is a private internal WeatherTrackUS coordination app. It is a Next.js App Router + React + TypeScript app backed by PostgreSQL/Prisma, with API routes for tasks, members, availability, live events, onboarding, Discord bot configuration, and Discord-driven operations workflows. The app serves WTUS owners, operations leads, section leads, and members; role and section scope decide what each user can read or mutate.

## Auth shape

- `authOptions` defines Auth.js providers, database sessions, and session enrichment; Discord OAuth syncs guild membership into `discordServerVerified`.
- The custom WTUS OIDC callback at `app/api/auth/callback/wtus-auth/route.ts` verifies signed OAuth state, PKCE, token claims, and the `wtus_member` claim before creating a database session cookie.
- `requireDiscordVerifiedUser` requires a signed-in session plus `discordServerVerified`; onboarding completion intentionally uses this weaker gate before setting dashboard membership.
- `requireCurrentUser` additionally requires active, verified onboarding and returns `CurrentAccess`.
- `requireGlobalOperator`, `isGlobalOperator`, and `canWorkInSection` enforce owner/operations-lead privileges and section-scoped member access.

## Threat model

Highest-impact bugs would let a non-member or unverified Discord account create a valid dashboard session, bypass onboarding, or elevate to owner/operations lead. Next are section-scope bypasses that let ordinary members modify other members, assignments, Discord mappings, invites, or live-event state outside their role. Invite tokens, OAuth callback redirects/state, Discord role sync, and bot webhooks are sensitive because they bridge external identity systems into dashboard authority.

## Project-specific patterns to flag

- App API route handlers under `app/api/**/route.ts` should generally call `requireCurrentUser` or `requireGlobalOperator`; exceptions should be explicit auth/onboarding/login routes.
- Mutations to members, roles, sections, Discord mappings, onboarding invites, live event assignments, and dispatch rules should not rely on client-supplied `memberId`, `globalRole`, `sectionRole`, or section keys without an access check.
- Self-service member updates must continue blocking operator-only fields (`globalRole`, `section`, `sectionRole`, `sections`, `discordUserId`) for non-operators.
- OAuth redirect handling should keep using `sanitizeRedirectPath`, `resolveSafeRedirectUrl`, `createOAuthState`, and `verifyOAuthState`; accepting raw `callbackUrl`, forwarded host values, or unsigned state is suspicious.
- Server-side request bodies should go through `parseBody` with the Zod schemas in `src/server/schemas.ts` before Prisma writes.

## Known false-positives

- `tests/**` contains intentionally mocked sessions, permissive provider metadata, fake secrets, and malicious redirect inputs.
- `src/generated/prisma/**` is generated client code and should not drive findings unless the vulnerable callsite is in app code.
- `app/api/auth/login/route.ts`, `app/api/auth/[...nextauth]/route.ts`, and the WTUS OIDC callback are intentionally public auth entry points, but their state/redirect checks still matter.
- `app/api/onboarding/complete/route.ts` intentionally permits Discord-verified but not-yet-onboarded users so they can finish onboarding.
- `scripts/grant-role.ts`, `scripts/revoke-vulnerable-sessions.ts`, and `prisma/seed.ts` are local/admin maintenance scripts, not public HTTP handlers.
