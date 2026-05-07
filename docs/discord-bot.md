# WTUS Discord Bot

## Positioning

The Discord bot should be the WTUS bot, not only an operations bot.

The team already operates from a Discord server, so the bot is a short-term priority. It should start by connecting the dashboard to day-to-day Discord workflows, then grow into the all-in-one WTUS bot over time.

## Short-Term Scope

The first bot version should focus on dashboard-connected actions:

- Discord-linked onboarding
- Team server membership verification for new signups
- Matching Discord user IDs to dashboard member records
- Show assigned tasks
- Create a quick task from Discord
- Update task status
- Mark current availability
- Schedule an availability window
- Show who is available for live event help
- Show current live event assignments
- Assign or update live event roles for leads
- Show active temporary role coverage
- Send task assignment alerts
- Send availability or live event help alerts to configured channels
- Send live event assignment alerts

## First Commands

Command names can change later, but the first set should be small:

- `/tasks mine`
- `/tasks create`
- `/tasks update`
- `/available now`
- `/available later`
- `/available list`
- `/event current`
- `/event mine`
- `/event assign`
- `/roles temp`

## Dashboard Relationship

The dashboard remains the source of truth.

The Discord bot should:

- Read and write the same database through app APIs or shared server-side modules
- Respect dashboard permissions
- Link back to dashboard records when useful
- Avoid keeping separate task or availability state inside Discord
- Avoid keeping separate live event assignment state inside Discord

## Required Configuration

The first connected build needs the variables listed in `.env.example`:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- Optional alert channel IDs for task, availability, and live event updates

The dashboard cannot honestly verify Discord server membership until `DISCORD_GUILD_ID` and either OAuth guild access or bot member lookup are configured.

Use Discord OAuth as the main dashboard login/onboarding path. The bot should still exist, but its first job should be server membership lookup, commands, and alerts rather than replacing login.

## Permissions

The bot should map Discord users to dashboard users.

Onboarding should stay relaxed. New members should be able to choose the teams they want to be part of, then adjust those member-focused team preferences later from their account/settings page.

Required early behavior:

- Only known WTUS members can use member commands
- Section leads can run section-level coordination and review commands
- Members can create, update, and own dashboard work from Discord where they are involved
- Owner and operations lead can run global admin commands
- Owner and operations lead can manage temporary role coverage
- Bot admin commands should be restricted to trusted Discord roles

## Alerts

Initial alerts should be practical and quiet:

- New assigned task
- Task marked blocked
- Member marked available for live event help
- Upcoming availability window
- New or changed live event assignment

Avoid noisy all-channel updates until the team has used the system enough to know what actually helps.

## Future WTUS Bot Direction

After dashboard integration is stable, the WTUS bot can expand into broader server utilities:

- Weather information commands
- Event coordination tools
- Verification workflows
- YouTube or social workflow helpers
- Team onboarding helpers
- Role and section lookup
- Admin utilities

These should build on the same identity, role, and section model as the dashboard.
