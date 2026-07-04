# [MEDIUM] Weak cryptographic operations and MD5 usage

**File:** [`bot/plugins/alert-dispatch/index.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/bot/plugins/alert-dispatch/index.ts#L28-L47) (lines 28, 46, 47)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `insecure-crypto`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The alert-dispatch plugin uses MD5 for hash generation. The code generates MD5 hashes for payload signing and channel validation. MD5 is cryptographically broken and vulnerable to collision attacks. An attacker could craft different weather alert data that produces the same MD5 hash, potentially bypassing validation and injecting malicious alerts into the Discord channels. This weak hashing algorithm could allow unauthorized alert injection and channel manipulation.

## Recommendation

Replace MD5 with SHA-256 or SHA-3 for hash generation. Implement HMAC with a secret key for message authentication. Audit the entire bot codebase for additional MD5 usage and weak cryptographic operations.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
