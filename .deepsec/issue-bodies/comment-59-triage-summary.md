## deepsec scan triage complete (2026-06-29)

**69 findings** processed from automated deepsec scan (exported 2026-06-28).

### New issues opened from scan
| Issue | Severity | Topic |
|-------|----------|-------|
| #80 | P0 / CRITICAL | OIDC client secret empty fallback + AUTH_SECRET dual-use |
| #81 | P0 / HIGH_BUG | Missing `PATCH /api/live-events/[eventId]` — silent data loss |
| #82 | HIGH | Auth callback forwarded-host redirect + OAuth fragility |
| #83 | BUG | Optimistic UI not rolled back on API failure |
| #84 | BUG | Bot TOCTOU races (alert dispatch, special-request buttons) |

### Existing issues updated with scan addenda
#7, #16, #17, #21, #23, #24, #44, #48, #51, #58

### False positives / noise (no issue filed)
- MD5 / font XSS in `app/layout.tsx` (Next.js font hashing, not app crypto)
- `oidc.ts` "client-side secret exposure" (server-only module, not bundled)
- Missing auth on root `layout.tsx` (middleware + route guards exist)
- `.env.example` placeholder values (not real secrets)
- Local `.env` flagged but gitignored — not in version control
- `process.env` in admin scripts without validation (expected for CLI tools)
- NWS/SPC User-Agent email (required by API policy)
- `design-export/tweaks-panel.jsx` postMessage (non-production artifact)
- Global operators targeting any member for special requests (intended behavior)

### Prioritized fix order (operational impact)
1. **#80** — verify production has `WTUS_DASHBOARD_OIDC_CLIENT_SECRET` set; empty fallback weakens OIDC trust
2. **#81 + #83** — live-event edits appear saved during active weather but are not persisted
3. **#51** — onboarding self-assign section `lead` + re-invocation by verified users
4. **#44** — any authenticated user can comment on any task ID
5. **#82** — hostile `X-Forwarded-Host` when `APP_URL` unset in production

None of the findings require private/security-advisory issues — they describe code defects, not live credential exposure.
