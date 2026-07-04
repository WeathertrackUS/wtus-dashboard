# [BUG] linkAccount event calls syncDiscordUser without profile parameter — discordHandle set to null

**File:** [`src/auth.ts`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/src/auth.ts#L171-L31) (lines 171, 31)
**Project:** wtus-dashboard
**Severity:** BUG  •  **Confidence:** high  •  **Slug:** `other-missing-argument`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The `linkAccount` event handler at line 171 calls `syncDiscordUser(user, account)` without passing the `profile` parameter. Inside `syncDiscordUser`, the `profile` parameter is cast to `DiscordProfile | undefined` and accessed as `discordProfile?.username` (line 31). When `profile` is `undefined`, `discordUsername` is always `null`. This means when a Discord account is linked to an existing user via the `linkAccount` event (which happens on first Discord sign-in for new users), the user's `discordHandle` is set to `null` in the database, losing their Discord username. The same issue occurs for the `signIn` callback at line 129, which does pass `profile`, so this is specifically a `linkAccount` issue.

## Recommendation

Pass the `profile` parameter from the `linkAccount` event handler to `syncDiscordUser`. The `linkAccount` event callback receives `user`, `account`, and `profile` — update the call to `await syncDiscordUser(user, account, profile)`.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-20)
