# [MEDIUM] Role grant script lacks input validation and authorization controls

**File:** [`scripts/grant-role.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/scripts/grant-role.ts#L15-L42) (lines 15, 16, 17, 40, 41, 42)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `other-input-validation`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The script accepts Discord user ID and role via command line arguments without validating the requesting user's authorization to grant roles. This could allow unauthorized individuals to elevate privileges if they gain access to execute the script. The script also doesn't log administrative actions, making accountability difficult.

## Recommendation

Implement proper authorization checks ensuring only privileged administrators can execute this script. Add logging for all privilege changes. Validate input formats (Discord ID, role key) and consider adding session-based authentication rather than relying solely on command-line arguments.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-05-07)
