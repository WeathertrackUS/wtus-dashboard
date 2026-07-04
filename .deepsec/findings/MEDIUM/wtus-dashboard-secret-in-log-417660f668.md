# [MEDIUM] Full error object logged on token exchange failure may leak OAuth artifacts

**File:** [`app/api/auth/callback/wtus-auth/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/auth/callback/wtus-auth/route.ts#L218) (lines 218)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `secret-in-log`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The catch block at L218 logs the raw `error` object: `console.error('[AUTH] OIDC token exchange/verification failed:', error)`. The `error` thrown by openid-client's `authorizationCodeGrant` can be an `RPError` or `ResponseBodyError` whose `message`, `stack`, and `response` properties may contain the token endpoint URL, HTTP method, response body (including `error`, `error_description`), and in some error modes the full request configuration. If server logs are forwarded to a centralized log aggregation service (e.g., Datadog, CloudWatch, LogDNA) with broader team access, or if log files are accessible via a debug endpoint, this can expose internal OIDC infrastructure details (issuer URL, client configuration) and diagnostic information that aids further attacks. While the authorization code itself is consumed by the token exchange and unlikely to appear in the error, the `stack` trace reveals internal file paths and the `message` can confirm whether the OIDC provider, client ID, or redirect URI is misconfigured.

## Recommendation

Replace `console.error('[AUTH] OIDC token exchange/verification failed:', error)` with a safe extraction: log only `error.message` or a fixed error code, and avoid logging the full error object or stack trace. If the error has an `error.error` property (OIDC error code), log just that. Use a structured logger with a field allowlist.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-21)
