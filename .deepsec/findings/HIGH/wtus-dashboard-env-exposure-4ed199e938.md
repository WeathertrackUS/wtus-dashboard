# [HIGH] Hardcoded NextAuth secret

**File:** [`.env`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/.env#L3) (lines 3)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** medium  •  **Slug:** `env-exposure`

## Finding

The AUTH_SECRET environment variable in .env file is hardcoded to a predictable value (though it's a placeholder). This secret is used to sign NextAuth session cookies and JWT tokens. If set to a low-entropy or known value, it allows attackers to forge session tokens and bypass authentication. The placeholder should be replaced with a high-entropy random string generated at deployment time.

## Recommendation

Generate a cryptographically secure random string for AUTH_SECRET and set it via the deployment environment. Ensure the value has sufficient entropy (at least 32 bytes) and is unique across deployments. Remove from source control and use your platform's secret management.
