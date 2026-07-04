# [MEDIUM] Environment variable file committed to version control

**File:** [`.env`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/.env#L1-L17) (lines 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `env-exposure`

## Finding

The .env file contains multiple production secrets and is committed to version control. This is a fundamental security violation as environment files typically contain sensitive credentials, API keys, database passwords, and other configuration that should never be stored in source repositories. The presence of this file enables credential harvesting and unauthorized access to multiple external services.

## Recommendation

Remove the .env file from the repository entirely and add it to .gitignore. Document in README that all secrets should be set via environment variables specific to the deployment environment. Use platform-specific secret managers like AWS Secrets Manager, Azure Key Vault, or environment variable injection from secure sources.
