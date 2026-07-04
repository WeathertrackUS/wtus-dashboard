# [MEDIUM] Session revocation lacks comprehensive audit logging

**File:** [`scripts/revoke-vulnerable-sessions.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/scripts/revoke-vulnerable-sessions.ts#L45-L46) (lines 45, 46)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `other-operation-logic`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

While the script logs basic information about affected users, it doesn't log the identity of administrators who initiated the session revocation, making it difficult to trace who performed privileged security operations. This could be exploited to hide malicious activity or deny accountability for security actions.

## Recommendation

Add logging for administrative actions including the requester's identity (e.g., process user, service account), action details, and timestamps. Include source IP if possible and maintain immutable audit logs separate from application logs.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-21)
