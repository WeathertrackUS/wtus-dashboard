# [MEDIUM] Missing validation on empty arrays allows undefined behavior

**File:** [`app/api/reminder-preferences/route.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/api/reminder-preferences/route.ts#L53-L83) (lines 53, 68, 73, 78, 83)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `other-logic-bug`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The upsert update clause uses `preferredDays: preferredDays ?? []` etc. However, if the client sends `null` for any of these array fields (which would be rejected by Zod schema since it expects `z.array(z.string()).optional().default([])`), the `??` operator would treat `null` as falsy and fall back to `[]`. This schema design is flawed because Zod will coerce `null` to `undefined` for optional fields, but the `optional().default([])` pattern should handle this correctly. However, the real issue is that the schema doesn't explicitly reject `null` values, allowing client-controlled empty/null arrays that get normalized server-side, which could affect authentication or authorization logic if those arrays are used elsewhere in permission checks.

## Recommendation

Update the schema to be more explicit: `z.array(z.string()).default([])` instead of `optional().default([])` for optional array fields, ensuring `null` input is rejected upfront. This prevents potentially problematic null values from being silently normalized.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-25)
