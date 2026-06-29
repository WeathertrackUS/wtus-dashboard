# Authentication

The WTUS Dashboard uses **WTUS Auth** (`https://auth.weathertrackus.com`) as its identity provider. Discord login is handled at the IdP layer; the dashboard does not run its own Discord OAuth flow.

Leantime (`https://tasks.weathertrackus.com`) uses the same issuer with a separate OIDC client registration.

## Sign-in entrypoint

All environments use one dashboard login path:

```text
GET /api/auth/login
```

Optional post-login destination:

```text
GET /api/auth/login?callbackUrl=/tasks
```

## Browser flow

Login always happens at **auth.weathertrackus.com**. After authentication, the IdP redirects back to the dashboard callback on the same origin where the app is running.

```text
1. Browser → GET /api/auth/login (dashboard)
2. Dashboard → 302 to https://auth.weathertrackus.com/authorize?redirect_uri=...
3. User signs in at WTUS Auth (Discord via IdP)
4. IdP → 302 to {APP_URL}/api/auth/callback/wtus-auth?code=...
5. Dashboard creates session → 302 to callback path
```

**Production:** `redirect_uri` is `https://<dashboard-domain>/api/auth/callback/wtus-auth`.

**Local dev:** `redirect_uri` is `http://127.0.0.1:3000/api/auth/callback/wtus-auth`. The IdP is still `auth.weathertrackus.com`; only the return address is local.

## Registered OIDC clients

Register these redirect URIs on WTUS Auth:

| Client | Redirect URI |
|--------|--------------|
| `wtus-dashboard` (production) | `https://<dashboard-domain>/api/auth/callback/wtus-auth` |
| `wtus-dashboard` (local dev) | `http://127.0.0.1:3000/api/auth/callback/wtus-auth` |
| Leantime | Per Leantime OIDC plugin config on `tasks.weathertrackus.com` |

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `APP_URL` | Dashboard origin (`http://127.0.0.1:3000` local; HTTPS in production) |
| `NEXTAUTH_URL` | Same origin as `APP_URL` |
| `AUTH_SECRET` | Session signing and OAuth state HMAC (min 32 chars) |
| `WTUS_DASHBOARD_OIDC_CLIENT_SECRET` | OIDC client secret for `wtus-dashboard` (must differ from `AUTH_SECRET`) |
| `OIDC_ISSUER_URL` | WTUS Auth issuer (default `https://auth.weathertrackus.com`) |
| `DATABASE_URL` | PostgreSQL connection |

Validate configuration without printing secrets:

```bash
pnpm validate:auth
```

## Bot integration (not login)

These variables support the Discord bot, not dashboard sign-in:

- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_CLIENT_ID` (bot application)

## Session and logout

Sessions are stored in PostgreSQL and read via NextAuth (`getServerSession`). Sign-out uses the standard NextAuth `/api/auth/signout` endpoint.

## Identity mapping

- Canonical user key: `User.discordUserId` from OIDC `discord_user_id` claim (fallback `sub`)
- Guild membership: OIDC `wtus_member === true` sets `discordServerVerified`
- Re-login must not downgrade users who already completed onboarding (`onboardingStatus: verified`, `status: active`)

## Nginx

Terminate TLS at Nginx. Set `APP_URL` to the public HTTPS origin. Forward `Host` and `X-Forwarded-Proto` from the real listener. See `deploy/nginx.conf.example`.

## Related docs

- [Environment Setup](environment.md)
- [Deployment Notes](deployment.md)
