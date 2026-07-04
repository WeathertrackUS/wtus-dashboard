import { createHash, randomUUID } from "node:crypto";

/** Generate a new random invite token (raw, to be shown once). */
export function generateInviteToken(): string {
  return randomUUID();
}

/** Compute the SHA-256 hex digest of a raw token for storage. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
