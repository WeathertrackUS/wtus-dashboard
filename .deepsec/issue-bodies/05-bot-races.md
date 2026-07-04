## Summary

deepsec flagged **TOCTOU / concurrency** issues in bot plugins:

- `bot/plugins/alert-dispatch/index.ts` — parallel Prisma work without per-operation error handling; possible partial alert processing.
- `bot/plugins/core/index.ts` / `syncDiscordUser` — read-then-write without transaction.
- Special-request button handler — read-then-write on `specialRequest` without status guard/transaction.

## Required changes

- Wrap related DB updates in transactions where state transitions must be atomic.
- Add status guards (e.g., only `open` → `accepted`) to prevent double-processing.
- Ensure all Prisma calls are awaited and failures abort the handler with logging.

## Acceptance criteria

- [ ] Concurrent button clicks cannot corrupt special-request state.
- [ ] Discord user sync cannot lose updates under concurrent events.
- [ ] Alert dispatch either fully records observability or fails loudly without partial side effects.
- [ ] Tests cover concurrent handler invocations where feasible.

## Source

Automated deepsec scan (`other-race-condition`, `other-logic-bug` TOCTOU findings).
