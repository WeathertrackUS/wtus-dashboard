# [HIGH] Hardcoded secrets in committed .env.example file

**File:** [`.env.example`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/.env.example#L5-L37) (lines 5, 10, 37)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `env-exposure`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

Multiple secret values are committed in the .env.example file: AUTH_SECRET, WTUS_DASHBOARD_OIDC_CLIENT_SECRET, and DISCORD_BOT_SYNC_SECRET. This exposes sensitive credentials that can be used to authenticate with Auth.js, OIDC verification, and Discord bot sync endpoints. The .gitignore only excludes .env, not .env.example, meaning this file will be committed to version control.

## Recommendation

Remove all secret values from .env.example and only document the variable names without values. Use environment variable injection or separate credential management systems for actual secrets in production.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-21)
