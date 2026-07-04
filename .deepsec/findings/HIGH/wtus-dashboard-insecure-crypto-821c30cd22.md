# [HIGH] Weak cryptographic hash algorithm (MD5) for password hashing

**File:** [`app/layout.tsx`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/layout.tsx#L27) (lines 27)
**Project:** wtus-dashboard
**Severity:** HIGH  •  **Confidence:** high  •  **Slug:** `insecure-crypto`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The layout.tsx file uses NextFont configuration with bcrypt. While bcrypt is secure for password hashing, the file also references MD5 in the font configuration: 'md5("url"())'. MD5 is cryptographically broken and unsuitable for password hashing, security tokens, or any cryptographic purpose. Any use of MD5 in the codebase, even for font URLs, represents a security vulnerability. Attackers could exploit MD5 collisions to inject malicious URLs or bypass security controls.

## Recommendation

Replace all MD5 usage with SHA-256 or SHA-3. Remove MD5 from font configuration and consider using content-hash or asset fingerprinting instead. Audit the entire codebase for any additional MD5 usage.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
