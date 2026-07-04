# [HIGH] Hardcoded Leantime API token

**File:** [`.env`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/.env#L11) (lines 11)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `env-exposure`

## Finding

The .env file contains the LEANTIME_API_KEY which is used to integrate with the Leantime task management system. This API key provides authenticated access to task operations and project data. Exposure allows attackers to modify or extract task information, potentially disrupting operations or accessing sensitive project data.

## Recommendation

Similar to the Discord bot token, this API key should be stored in a secure secret manager, not in source control. Use your hosting platform's secret management system and inject it as an environment variable at runtime.
