## deepsec triage addendum (2026-06-29)

Scan flagged production risk from `NEXT_PUBLIC_ENABLE_LOCAL_PREVIEW`: when `'true'`, client-side auth gates are bypassed and `effectiveRole` comes from `localStorage`, allowing unauthenticated visitors to render the full dashboard shell with a self-selected role (API routes still enforce server auth, but UI/data visibility from cached state is exposed).

Recommend: never set in production builds, add server-side guard in middleware, or replace with a separate dev build target.
