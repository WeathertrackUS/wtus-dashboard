# Environment Setup

## Where Variables Go

Create a local `.env` file at the project root by copying `.env.example`.

Do not commit `.env`. It is ignored by git on purpose.

Use `.env.example` as the shared checklist for required variables.

See [Authentication](authentication.md) for the full login flow.

## Local Development

For local development, start with:

```env
APP_URL=http://127.0.0.1:3000
NEXTAUTH_URL=http://127.0.0.1:3000
AUTH_SECRET=replace-with-a-long-random-secret
WTUS_DASHBOARD_OIDC_CLIENT_SECRET=replace-with-a-different-long-random-secret
OIDC_ISSUER_URL=https://auth.weathertrackus.com
DATABASE_URL=postgresql://wtus:wtus@localhost:5432/wtus_dashboard
```

Register `http://127.0.0.1:3000/api/auth/callback/wtus-auth` on the `wtus-dashboard` OIDC client at WTUS Auth.

Validate your config:

```bash
pnpm validate:auth
```

## WTUS Auth (dashboard login)

All environments use WTUS Auth as the only dashboard sign-in path:

1. User opens `/api/auth/login` on the dashboard.
2. Browser redirects to `https://auth.weathertrackus.com` (Discord handled at the IdP).
3. IdP redirects back to `{APP_URL}/api/auth/callback/wtus-auth`.
4. Dashboard creates a database session.

Required variables:

- `OIDC_ISSUER_URL`
- `WTUS_DASHBOARD_OIDC_CLIENT_SECRET`
- `APP_URL` and `NEXTAUTH_URL` (same origin)
- `AUTH_SECRET` (must differ from the OIDC client secret)

## Discord bot

Bot variables are separate from login:

```env
DISCORD_CLIENT_ID=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
```

Optional alert channels can stay blank until the bot sends alerts:

```env
DISCORD_TASK_ALERT_CHANNEL_ID=
DISCORD_AVAILABILITY_ALERT_CHANNEL_ID=
DISCORD_LIVE_EVENT_ALERT_CHANNEL_ID=
```

## Onboarding Links

Owner and operations lead users create invite links from Team Setup.

The invite page expects the incoming member to sign in through WTUS Auth first. The dashboard uses the signed-in session's Discord identity from OIDC claims.

The invite completion route requires:

- A valid open invite token
- A signed-in session with `discordServerVerified`

Used or disabled invite links cannot complete onboarding.

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
- Prisma
- WTUS Auth (OIDC) for login
- Discord.js for the bot
- Nginx reverse proxy
- Systemd services for the app and bot
