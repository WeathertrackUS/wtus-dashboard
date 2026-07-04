# [HIGH] Hardcoded Discord bot token

**File:** [`.env`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/.env#L5) (lines 5)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `env-exposure`

## Finding

The .env file contains the DISCORD_BOT_TOKEN which is a hardcoded production secret. This token provides unauthorized access to Discord operations and can be used to impersonate or control the Discord bot. The file is committed to version control, exposing this credential to anyone with repository access. The token appears to be used for Discord bot operations and webhook authentication, making it critical for maintaining secure Discord integration.

## Recommendation

Move the DISCORD_BOT_TOKEN to a secure secret management system like AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault. Remove the .env file from version control and add it to .gitignore. Use environment variable injection or runtime configuration to provide the token at deployment time.
