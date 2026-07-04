# [CRITICAL] Weak fallback JWT secret configuration

**File:** [`src/lib/oidc.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/lib/oidc.ts#L19-L20) (lines 19, 20)
**Project:** wtus-dashboard
**Severity:** CRITICAL  •  **Confidence:** high  •  **Slug:** `insecure-crypto`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The code has a fallback from WTUS_DASHBOARD_OIDC_CLIENT_SECRET to AUTH_SECRET with the potential to use an empty string as the final fallback. Using weak or empty secrets for JWT signing/verification could allow attackers to forge tokens, bypass authentication, or conduct other cryptographic attacks.

## Recommendation

Ensure WTUS_DASHBOARD_OIDC_CLIENT_SECRET is always set with a strong, secure value. Do not allow empty string fallbacks for secrets. Implement proper validation to ensure the configured secret is strong and properly protected.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-21)
