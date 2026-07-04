## Summary

deepsec flagged several related **auth callback** risks in `app/api/auth/callback/wtus-auth/route.ts` and `src/auth.ts`:

1. **Open redirect / cookie weakening via forwarded headers** — when `APP_URL` is unset or localhost, `getAppBaseUrl()` can derive origin from `X-Forwarded-Host` / `X-Forwarded-Proto`, affecting post-login redirects and `Secure` / `__Secure-` cookie behavior.
2. **`checks: []` on the `wtus-auth` NextAuth provider** — no built-in OAuth state/CSRF checks; defense relies entirely on the custom callback route.
3. **OAuth error logging** — full error object logged on token exchange failure may include sensitive artifacts.

## Required changes

- In production, require `APP_URL` (non-localhost) and reject callbacks when derived base URL does not match configured `APP_URL`.
- Enable `checks: ['state']` on the `wtus-auth` provider for defense in depth, or document and test the custom-only path.
- Redact/sanitize OAuth error logs.
- Extend existing `auth-callback-redirect.test.ts` coverage for hostile forwarded headers in production mode.

## Acceptance criteria

- [ ] Production cannot be tricked into redirecting users to attacker-controlled hosts after login.
- [ ] Session cookies always use intended `Secure` / `__Secure-` settings in production.
- [ ] OAuth logs do not emit tokens/secrets.
- [ ] Tests cover missing `APP_URL`, hostile forwarded headers, and state validation.

## Related issues

- #58 (trusted proxy / rate limits / cookie cleanup)

## Source

Automated deepsec scan (`unsafe-redirect`, `missing-csrf-state-check`, `secret-in-log`).
