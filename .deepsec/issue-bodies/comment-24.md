## deepsec triage addendum (2026-06-29)

Automated brief plugin uses an in-memory `sentBriefs` set for deduplication — does not survive bot restarts, so duplicate briefs can be sent after a process restart. Aligns with making brief scheduling/idempotency durable (this issue's scope).
