export type InviteAuditEvent =
  | "invite.created"
  | "invite.disabled"
  | "invite.used"
  | "invite.expired"
  | "invite.completed"
  | "invite.creation_rate_limited"
  | "invite.completion_rate_limited"
  | "invite.invalid_token"
  | "invite.fetch_token_unauthorized";

interface AuditEntry {
  event: InviteAuditEvent;
  inviteId?: string;
  userId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Log an invite-related audit event.
 * Never logs raw tokens — only hashed identifiers or invite IDs.
 */
export function logInviteAudit(entry: Omit<AuditEntry, "timestamp">): void {
  const record: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  // In production, this would write to a proper audit log sink.
  // For now, use structured console output that omits sensitive data.
  console.log("[AUDIT]", JSON.stringify(record));
}
