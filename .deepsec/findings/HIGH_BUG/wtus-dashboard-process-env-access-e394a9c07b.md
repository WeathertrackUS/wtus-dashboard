# [HIGH_BUG] Direct environment variable access without validation in privileged script

**File:** [`scripts/revoke-vulnerable-sessions.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/scripts/revoke-vulnerable-sessions.ts#L6) (lines 6)
**Project:** wtus-dashboard
**Severity:** HIGH_BUG  •  **Confidence:** high  •  **Slug:** `process-env-access`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

This session revocation script directly accesses process.env.DATABASE_URL without validation. As an administrative script that revokes user sessions, it represents a high-privilege operation point. If environment variables are missing or improperly configured, it could disrupt critical security operations. The script is intended for security remediation but lacks proper input validation for the database connection.

## Recommendation

Add validation for DATABASE_URL with proper error handling. Ensure the script can fail securely with clear error messages. Consider logging access attempts for audit trails and implement additional safeguards for privileged administrative operations.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-21)
