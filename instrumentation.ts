export function register() {
  if (process.env.NODE_ENV !== "production") return;

  if (!process.env.WTUS_DASHBOARD_OIDC_CLIENT_SECRET?.trim()) {
    throw new Error("WTUS_DASHBOARD_OIDC_CLIENT_SECRET is required in production");
  }
}
