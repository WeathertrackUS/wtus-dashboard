# [HIGH] Hardcoded secrets in committed .env file

**File:** [`.env`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/.env#L4-L15) (lines 4, 9, 10, 15)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `env-exposure`

## Finding

The .env file contains hardcoded secrets including AUTH_SECRET, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, and LEANTIME_API_KEY. These credentials are committed to version control and could be exposed to unauthorized actors who gain access to the repository. The AUTH_SECRET is particularly sensitive as it's used for signing NextAuth session cookies, while the DISCORD_BOT_TOKEN allows full Discord bot control, and the LEANTIME_API_KEY provides access to task management systems.

## Recommendation

Remove the .env file from version control, store secrets in environment variables (e.g., via .env.local, Docker secrets, or cloud provider secret management), and ensure the .gitignore file explicitly excludes .env and similar configuration files.
