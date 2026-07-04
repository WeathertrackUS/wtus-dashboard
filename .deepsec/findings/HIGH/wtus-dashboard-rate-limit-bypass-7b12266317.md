# [HIGH] Missing Rate Limiting on Work Submission Endpoint

**File:** [`app/api/work-submissions/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/work-submissions/route.ts#L24-L32) (lines 24, 32)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `rate-limit-bypass`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The work submission endpoint (POST /api/work-submissions) lacks rate limiting, making it vulnerable to abuse. An attacker could flood this endpoint with work submissions to spam the system, cause database performance degradation, or conduct DoS attacks. This is a sensitive operation that should be protected with rate limiting to prevent abuse.

## Recommendation

Implement rate limiting middleware using a library like 'next-rate-limit' or 'express-rate-limit' adapted for Next.js API routes. Set appropriate limits (e.g., 10 requests per minute per IP) and consider user-based limits for authenticated users.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
