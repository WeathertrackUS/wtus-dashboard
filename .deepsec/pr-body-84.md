## Summary
- Adds atomic special-request responses via conditional `updateMany` guarded on `status: open`.
- Makes weather alert ingestion transactional and idempotent, dispatching Discord alerts only on first create.
- Coalesces overlapping Discord role syncs per user within a single bot process.
- Adds structured error logging for weather alert dispatch failures.

Closes #84

## Test plan
- [x] `pnpm test tests/bot-concurrency.test.ts`
- [x] `pnpm test` (109 tests)
- [ ] Manual: double-click Accept on a special-request DM button — only one response persisted
- [ ] Manual: trigger overlapping role sync (webhook + interval) — roles end in correct final state
