# [HIGH] Hardcoded Discord OAuth client secret

**File:** [`.env`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/.env#L10) (lines 10)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** medium  •  **Slug:** `env-exposure`

## Finding

The .env.example file (which is often used as a reference) contains a placeholder for DISCORD_CLIENT_SECRET that is not properly redacted. The example file suggests developers should copy this section and fill in actual values, but the presence of placeholder secrets in committed code can lead to accidental exposure during setup or deployment. Additionally, other secrets in .env.example like OIDC client secret should not be committed.

## Recommendation

Ensure .env.example only contains non-sensitive configuration placeholders. Use actual environment variable names without values, or remove potentially sensitive sections entirely. For secrets, provide documentation only with instructions to set them via the deployment system, not copy-paste from version control.
