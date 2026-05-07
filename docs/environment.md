# Environment Setup

## Where Variables Go

Create a local `.env` file at the project root by copying `.env.example`.

Do not commit `.env`. It is ignored by git on purpose.

Use `.env.example` as the shared checklist for required variables.

## Local Development

For local development, start with:

```env
APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=replace-with-a-long-random-secret
DATABASE_URL=postgresql://wtus:wtus@localhost:5432/wtus_dashboard
```

When Discord is ready, fill in:

```env
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
```

Optional alert channels can stay blank until the bot sends alerts:

```env
DISCORD_TASK_ALERT_CHANNEL_ID=
DISCORD_AVAILABILITY_ALERT_CHANNEL_ID=
DISCORD_LIVE_EVENT_ALERT_CHANNEL_ID=
```

## Discord OAuth

OAuth should be the main login and onboarding path.

It gives the app:

- The user's Discord identity
- A stable Discord user ID
- A clean sign-in flow
- A natural way to connect dashboard accounts to Discord accounts

The app should request the smallest practical scopes first:

- `identify`
- `guilds`, if using OAuth to inspect the user's server list

If OAuth guild checks are not enough for the final server verification behavior, the bot can do a server-side member lookup using `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID`.

Recommended first approach:

1. Use Discord OAuth for login.
2. Store the Discord user ID on the dashboard user.
3. Check whether that Discord user is in `DISCORD_GUILD_ID`.
4. Let the bot handle ongoing Discord commands and alerts.

## Discord Bot

The bot should not have its own separate dashboard state.

It should use the same database or app APIs as the web app.

Use the bot token for:

- Server membership lookup
- Slash commands
- Alerts
- Live event coordination from Discord

## VPS Stack Recommendation

Recommended production stack:

- Next.js
- React
- TypeScript
- PostgreSQL
- Prisma or Drizzle
- Auth.js with Discord OAuth
- Discord.js for the bot
- Nginx reverse proxy
- Systemd services for the app and bot

Why this fits WTUS:

- One repo
- One database
- One VPS
- Server-rendered app routes where auth matters
- API routes for dashboard and bot workflows
- Easy environment variable setup
- Not overbuilt

The app now uses Next.js so real auth, database persistence, and Discord verification can live in server-side routes instead of being bolted onto a static client shell.
