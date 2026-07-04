# [HIGH] Missing Rate Limiting on Invite Creation

**File:** [`app/api/onboarding/invites/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/onboarding/invites/route.ts#L30) (lines 30)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `rate-limit-bypass`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

This endpoint at /api/onboarding/invites (POST) creates onboarding invites and is accessible to global operators (owners and operations leads). While it has authentication and authorization checks via requireGlobalOperator(), there is no rate limiting implemented. An attacker who compromises a global operator account (through session theft, credential reuse, or phishing) could abuse this endpoint to create unlimited invites, potentially causing DoS through resource exhaustion or user account proliferation. This endpoint likely performs database writes and could be abused at scale without abuse protection.

## Recommendation

Add rate limiting middleware to restrict the number of invite creations per operator. Implement a reasonable rate limit (e.g., 10 requests per minute per IP or user) with exponential backoff for exceeded limits. Consider using a rate limiting library like 'express-rate-limit' (for Node.js middleware) or similar Next.js-compatible solutions. The limit should be configurable and logged for monitoring potential abuse.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
- realjwx <192305193+realjwx@users.noreply.github.com> (2026-06-25)
