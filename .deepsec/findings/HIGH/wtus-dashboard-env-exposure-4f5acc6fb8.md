# [HIGH] Hardcoded OIDC client secret

**File:** [`.env`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/.env#L8) (lines 8)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** medium  •  **Slug:** `env-exposure`

## Finding

The .env.example file contains WTUS_DASHBOARD_OIDC_CLIENT_SECRET with a placeholder value that should be kept secret. This OIDC (OpenID Connect) client secret is used for OIDC authentication and provides access to the WTUS Auth system. If this value is exposed, attackers can impersonate the dashboard application and obtain valid access tokens.

## Recommendation

Remove the WTUS_DASHBOARD_OIDC_CLIENT_SECRET from .env.example as it contains a placeholder secret. Provide instructions for setting this secret via secure configuration methods only, and document that it should be a high-entropy random string generated during deployment.
