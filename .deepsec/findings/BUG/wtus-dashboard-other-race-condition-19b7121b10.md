# [BUG] TOCTOU race condition in handleButton — read-then-write on specialRequest without transaction or status guard

**File:** [`bot/plugins/core/index.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/bot/plugins/core/index.ts#L399-L405) (lines 399, 400, 401, 405)
**Project:** wtus-dashboard
**Severity:** BUG  •  **Confidence:** medium  •  **Slug:** `other-race-condition`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The handleButton method (L393–L414) performs a non-atomic read-then-write on the specialRequest table. First it calls findUnique to check ownership (existing.targetUserId !== user.id), then unconditionally calls update to set the status and respondedAt. There is no transaction wrapping these operations, and critically, there is no check that existing.status === 'open' before allowing the update. This means: (1) If two rapid Discord button clicks are processed concurrently, both can pass the ownership check before either writes, allowing the status to be set twice with different respondedAt timestamps. (2) A request that has already been 'cancelled' by an operator or 'declined' by the user could theoretically be re-activated to 'accepted' or vice versa if the Discord button components are somehow still present. In practice, Discord removes button components after interaction.update(), limiting the exploit window, but the code is not defensively correct.

## Recommendation

Wrap the findUnique + update in a Prisma transaction, and add a status guard: `if (existing.status !== 'open') { await interaction.reply({...}); return; }`. Alternatively, use an atomic update with a WHERE clause: `prisma.specialRequest.updateMany({ where: { id: requestId, targetUserId: user.id, status: 'open' }, data: { status: response, respondedAt: new Date() } })` and check the count of affected rows.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
