## deepsec triage addendum (2026-06-29)

Leantime RPC failures may return raw upstream error messages to authenticated API clients, potentially disclosing internal integration details. Recommend mapping Leantime errors to stable, client-safe error codes in the Leantime client layer.
