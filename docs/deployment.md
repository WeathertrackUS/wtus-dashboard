# Deployment Notes

## Target

The WTUS Dashboard should run on a VPS and be accessible on the web as a private internal application.

The app is not public-facing, but it will be internet-accessible. Treat authentication, secrets, backups, and updates as first-class requirements.

## Recommended Production Shape

Keep the first deployment simple:

- One VPS
- One app process
- One Discord bot process once bot integration begins
- One production database
- Nginx as reverse proxy
- HTTPS with Let's Encrypt
- Systemd or a process manager to keep the app running
- Systemd or a process manager to keep the Discord bot running
- Automated database backups

## Recommended Stack

Recommended:

- Runtime: Node.js LTS
- App server: Next.js standalone output managed by systemd
- Reverse proxy: Nginx
- Database: PostgreSQL
- ORM: Prisma or Drizzle
- Auth: Auth.js with Discord OAuth
- Bot: Discord.js as a separate process in the same repo

Use PostgreSQL for local development and production so the app is not switching database behavior when it moves to the VPS.

## Production Requirements

Before real team use:

- Use HTTPS
- Store secrets in environment variables
- Set `APP_URL` and `NEXTAUTH_URL` to the public HTTPS dashboard URL
- Use secure password/session settings
- Restrict admin features by role
- Seed only the required global roles and WTUS sections
- Back up the database at least daily
- Keep deployment instructions in the repo

In production, the main dashboard is behind Discord OAuth. Local role preview and browser localStorage fallback are development-only. Onboarding links stay reachable so a new member can connect Discord before their dashboard account exists.

## Minimum Environment Variables

Create `.env` from `.env.example`. The first production pass should expect:

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_URL`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_TASK_ALERT_CHANNEL_ID`
- `DISCORD_AVAILABILITY_ALERT_CHANNEL_ID`
- `DISCORD_LIVE_EVENT_ALERT_CHANNEL_ID`
- Mail provider settings if invitations or password resets are enabled

`DISCORD_GUILD_ID` is required before the app can verify that an onboarding signup is actually in the WTUS Discord server.

## Deployment Flow

Initial simple flow:

1. Push changes to the repository.
2. Pull latest changes on the VPS.
3. Install dependencies.
4. Run production database migrations.
5. Build the app.
6. Restart the app service.
7. Restart the Discord bot service if bot code changed.
8. Confirm the health page, login, and bot status work.

The production migration command is:

```bash
pnpm db:deploy
```

## Discord Bot Process

The first bot entrypoint is `bot/index.ts`.

Use these commands on the VPS after environment variables are set:

```bash
pnpm bot:register
pnpm bot:start
```

Run `pnpm bot:register` after command changes. Run `pnpm bot:start` under systemd or the same process manager used for the web app.

Starter service and proxy templates live in `deploy/`:

- `deploy/wtus-dashboard.service`
- `deploy/wtus-bot.service`
- `deploy/nginx.conf.example`

Copy them to the VPS, adjust paths, user, and domain, then enable the services with systemd.

Automation can come later after the app is stable.

## Security Notes

Because this app is web-accessible:

- Do not ship a shared invite token as the only protection.
- Do not expose role management to regular members.
- Do not commit production secrets.
- Do not use debug mode in production.
- Add rate limiting or provider-level protection for login if abuse becomes a concern.

## Backups

At minimum:

- Daily database backup
- Keep several recent backups
- Test restore before the app becomes important to daily operations

Future uploads or attachments should have their own backup plan.
