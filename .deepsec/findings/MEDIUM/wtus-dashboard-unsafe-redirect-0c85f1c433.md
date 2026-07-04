# [MEDIUM] Post-authentication open redirect via X-Forwarded-Host when APP_URL is unconfigured

**File:** [`app/api/auth/callback/wtus-auth/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/auth/callback/wtus-auth/route.ts#L83-L193) (lines 83, 39, 186, 191, 193)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `unsafe-redirect`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The success redirect at L186 constructs `new URL(safeCallbackPath, appBaseUrl)` where `appBaseUrl` is derived from `getAppBaseUrl(request)`. In `safe-redirect.ts`, when `APP_URL` (or `NEXTAUTH_URL`) is not set — or is set to localhost — the function falls back to `requestOrigin`, built from `x-forwarded-host` and `x-forwarded-proto` headers (L65-68). An attacker who controls these headers (e.g., via direct connection to the origin or a misconfigured proxy) can set `appBaseUrl` to `https://evil.com`. Although `safeCallbackPath` is cryptographically signed and cannot be tampered with, the browser is still redirected to `https://evil.com/{safeCallbackPath}` after successful authentication. The attacker does NOT obtain the session cookie (it is set for the actual request domain, not the attacker's), but the user's browser lands on the attacker's domain, which enables phishing, credential harvesting, or tabnabbing. Additionally, the `useSecureCookie` flag (L191) and `buildSessionCookieName` (L193) derive their values from `appBaseUrl`, so a malicious `appBaseUrl` of `http://evil.com` causes the session cookie to be set without the `Secure` flag and without the `__Secure-` prefix, weakening cookie transport security. The same `appBaseUrl` affects the error redirect path at L39 (`oauthErrorRedirect`).

## Recommendation

In production, always require `APP_URL` to be set to a non-localhost value. Add an explicit check at the top of the GET handler: if `process.env.NODE_ENV === 'production'` and `getAppBaseUrl(request)` does not match `process.env.APP_URL`, reject the request with 400. Alternatively, change `getAppBaseUrl` to always return `process.env.APP_URL` in production regardless of headers, and use `request.url` only as a last-resort fallback.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-21)
