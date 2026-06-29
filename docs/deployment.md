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
- Auth: WTUS Auth (OIDC) via `/api/auth/login`
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

The main dashboard is behind WTUS Auth in all environments. Local role preview and browser localStorage fallback only turn on when `NEXT_PUBLIC_ENABLE_LOCAL_PREVIEW=true`. Onboarding links stay reachable so a new member can sign in before their dashboard account exists.

Run `pnpm validate:auth` before deploying to confirm required auth variables are set.

## Minimum Environment Variables

Create `.env` from `.env.example`. The first production pass should expect:

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_URL`
- `NEXTAUTH_URL`
- `WTUS_DASHBOARD_OIDC_CLIENT_SECRET`
- `OIDC_ISSUER_URL`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_CLIENT_ID` (bot application)
- `DISCORD_TASK_ALERT_CHANNEL_ID`
- `DISCORD_AVAILABILITY_ALERT_CHANNEL_ID`
- `DISCORD_LIVE_EVENT_ALERT_CHANNEL_ID`
- Mail provider settings if invitations or password resets are enabled

`DISCORD_GUILD_ID` is required for bot server verification. User login guild checks come from the WTUS Auth `wtus_member` OIDC claim.

## WTUS Auth redirect URIs

Register these on the `wtus-dashboard` client at WTUS Auth:

```text
http://127.0.0.1:3000/api/auth/callback/wtus-auth
https://your-domain.example/api/auth/callback/wtus-auth
```

`APP_URL` and `NEXTAUTH_URL` must use the same origin as the redirect you are testing. `localhost` and `127.0.0.1` do not count as the same URL to OIDC redirect matching.

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

### GitHub Actions deploy

The repo now includes `.github/workflows/deploy.yml` for push-to-`main` deploys and manual runs.

Required GitHub secrets:

- `WTUS_VPS_HOST`
- `WTUS_VPS_USER`
- `WTUS_VPS_SSH_KEY`

The workflow:

1. Syncs the repository to `/opt/wtus-dashboard` on the VPS.
2. Runs `pnpm install --frozen-lockfile`.
3. Runs `pnpm db:deploy`.
4. Builds the app with `pnpm build`.
5. Copies the standalone static assets into place.
6. Restarts `wtus-dashboard` and `wtus-bot`.
7. Verifies the dashboard service is active.

The production migration command is:

```bash
pnpm db:deploy
```

## First Owner / Operations Lead

The app does not auto-promote the first Discord login. To bootstrap leadership:

1. Have the person sign in through WTUS Auth and finish onboarding.
2. Get their Discord user ID.
3. Run one of these commands:

```bash
pnpm admin:grant-role --discord-id DISCORD_USER_ID --role owner
pnpm admin:grant-role --discord-id DISCORD_USER_ID --role operations_lead
```

Use this for the first owner, the operations lead, and emergency role repair. After an owner or operations lead exists, role management can move into the dashboard UI.

## Discord Bot Process

The first bot entrypoint is `bot/index.ts`.

Use these commands on the VPS after environment variables are set:

```bash
pnpm bot:invite
pnpm bot:register
pnpm bot:start
```

Open the `pnpm bot:invite` URL once to install the bot into the WTUS Discord server. The invite must use the same Discord application as `DISCORD_CLIENT_ID` and include both `bot` and `applications.commands` scopes. If command registration returns `Missing Access`, the bot is not installed in `DISCORD_GUILD_ID` or it was invited with the wrong application/scopes.

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
