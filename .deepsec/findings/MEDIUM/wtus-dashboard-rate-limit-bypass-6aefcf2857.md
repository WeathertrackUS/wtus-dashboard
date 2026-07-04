# [MEDIUM] No rate limiting on member PATCH endpoint

**File:** [`app/api/members/[memberId]/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/members/[memberId]/route.ts#L48) (lines 48)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `rate-limit-bypass`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The PATCH handler for `/api/members/[memberId]` has no rate limiting. While authentication is required, a verified user (or operator) could rapidly issue PATCH requests to modify member profiles. This could be exploited to: (1) cause excessive database writes and Discord sync triggers (line 95 calls `triggerDiscordSync` which makes an HTTP POST for every role-changing request), (2) rapid-fire handle changes to confuse other members or cause a denial-of-service on the Discord bot sync service, or (3) in combination with the lost-update race condition, amplify the likelihood of data corruption by flooding concurrent requests. The `triggerDiscordSync` function (line 13-20) is fire-and-forget with silent error swallowing (`.catch(() => {})`), so rapid requests would queue up unbounded HTTP requests to the internal bot sync service.

## Recommendation

Add rate limiting middleware to this endpoint. A reasonable limit would be 10 requests per minute per user for profile updates, and a separate lower limit (e.g., 2/minute) for role-changing operations that trigger Discord sync. Also consider adding a rate limit to the `triggerDiscordSync` function itself (e.g., debounce or deduplicate sync requests for the same userId within a short window).

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
