# [HIGH_BUG] Resource leak from unhandled promise rejections

**File:** [`bot/plugins/alert-dispatch/index.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/bot/plugins/alert-dispatch/index.ts#L54-L80) (lines 54, 70, 80)
**Project:** wtus-dashboard
**Severity:** HIGH_BUG  •  **Confidence:** high  •  **Slug:** `other-resource-leak`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The plugin lacks proper error handling for Discord API calls, particularly in sendUserDMs method. When user.send() fails, the error is caught but logged synchronously. Multiple failed DMs could lead to resource exhaustion and repeated error logging. Additionally, the client.channels.fetch call in postToChannel has no timeout or retry mechanism, which could cause hanging operations and resource leaks during Discord API issues or network problems.

## Recommendation

Implement retry logic with exponential backoff for failed Discord API calls. Add timeout handling for channel and user fetch operations. Limit the number of error retries to prevent resource exhaustion. Consider implementing circuit breaker patterns for persistent failures.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
