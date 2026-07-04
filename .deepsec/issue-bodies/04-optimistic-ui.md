## Summary

deepsec flagged a **BUG** pattern across `src/App.tsx`: optimistic local state is applied before API calls, but failures (`!response.ok` or empty `catch {}`) do not roll back UI state or notify the operator. This is especially dangerous combined with the missing live-events PATCH route (#81).

## Examples

- `updateTaskStatus`, `editTask`, `addComment`
- `changeGlobalRole`, `changeSectionRole`, `addCoverage`, `createInvite`
- Live event mutations (`saveEventUpdate`, `postUpdate`)

## Required changes

- Revert optimistic state on non-OK responses and network errors.
- Replace silent `catch {}` blocks with user-visible error feedback (toast/banner) and structured logging.
- Consider a shared mutation helper to avoid repeating the pattern.

## Acceptance criteria

- [ ] Failed mutations restore prior UI state.
- [ ] Operators see a clear error when persistence fails.
- [ ] Live-event and role changes cannot appear saved after a 404/5xx.
- [ ] Tests cover at least one representative mutation failure path.

## Source

Automated deepsec scan (`other-logic-bug` optimistic UI finding).
