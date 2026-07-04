# [BUG] In-memory sentBriefs deduplication set does not survive process restarts, risking duplicate brief sends

**File:** [`bot/plugins/core/index.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/bot/plugins/core/index.ts#L19-L206) (lines 19, 197, 206)
**Project:** wtus-dashboard
**Severity:** BUG  •  **Confidence:** high  •  **Slug:** `other-ephemeral-state`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The sentBriefs Set (L19) is an in-memory data structure used to prevent sending duplicate daily briefs to the same user within a calendar day. If the Node.js process restarts (deploy, crash, scaling event) while still within the configured briefHourUtc window, the set is cleared and sendAutomaticBriefs() will re-send briefs to all eligible users. This causes duplicate DM spam to members. The set is also shared across all concurrent invocations of sendAutomaticBriefs, but since it's checked synchronously before the async DB query, there's a small race window in the for-loop where two concurrent scheduler ticks could both send to the same user.

## Recommendation

Persist the dedup state in the database (e.g., a BriefLog table with userId + dayKey unique constraint, or use Prisma upsert with a unique constraint). This ensures restarts don't cause duplicates and provides a durable audit trail.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
