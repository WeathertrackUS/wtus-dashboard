## Summary

deepsec flagged a **CRITICAL** issue in `src/lib/oidc.ts`: the OIDC client secret resolves with fallbacks that can end as an empty string:

```ts
process.env.WTUS_DASHBOARD_OIDC_CLIENT_SECRET?.trim() ||
process.env.AUTH_SECRET?.trim() ||
"";
```

If `WTUS_DASHBOARD_OIDC_CLIENT_SECRET` is unset in a deployment, the app may boot with a weak or empty OIDC client secret. That weakens token exchange and OIDC trust boundaries.

Related findings also noted `AUTH_SECRET` dual-use as an OIDC client secret fallback (`dual-use-secret`).

## Required changes

- Require `WTUS_DASHBOARD_OIDC_CLIENT_SECRET` at startup in non-local environments; fail fast if missing/blank.
- Remove the empty-string fallback and avoid reusing `AUTH_SECRET` as the OIDC client secret.
- Add startup validation/tests that production config rejects blank secrets.
- Document required env vars in deployment docs.

## Acceptance criteria

- [ ] App refuses to start (or refuses OIDC login) when `WTUS_DASHBOARD_OIDC_CLIENT_SECRET` is missing in production.
- [ ] No code path uses `""` as an OIDC client secret.
- [ ] `AUTH_SECRET` is used only for session/signing concerns, not OIDC client auth.
- [ ] Tests cover missing-secret startup behavior.

## Source

Automated deepsec scan (`insecure-crypto`, `dual-use-secret`). 69 findings exported 2026-06-28.
