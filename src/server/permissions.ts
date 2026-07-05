import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth";
import { prisma } from "../db";
import type { SectionKey } from "../types";
export type { SectionKey };

// ─── Role Types ──────────────────────────────────────────────────────────────

export type GlobalRole = "owner" | "operations_lead" | "member";
export type SectionRoleType = "lead" | "member";

export type CurrentAccess = {
  userId: string;
  globalRoles: string[];
  sections: Array<{ section: SectionKey; role: SectionRoleType }>;
};

export type AccessResult = { access: CurrentAccess } | { response: NextResponse };

type VerifiedDiscordResult =
  | {
      userId: string;
      user: {
        discordServerVerified: boolean;
        onboardingStatus: "pending" | "verified";
        status: "active" | "inactive" | "invited";
        globalRoles: Array<{ role: { key: string } }>;
        sectionMemberships: Array<{ role: "lead" | "member"; section: { key: SectionKey } }>;
      };
    }
  | { response: NextResponse };

// ─── Permission Matrix ───────────────────────────────────────────────────────

/**
 * Resource/Action permission matrix.
 *
 * Roles: owner, operations_lead, section_lead, member, self, unauthenticated
 *
 * Each entry defines which roles can perform the action.
 * "section_scoped" means the action is limited to the user's section(s).
 * "self_only" means the action is limited to the user's own resources.
 */

export type PermissionAction =
  // Tasks & Comments
  | "tasks:create"
  | "tasks:read"
  | "tasks:update"
  | "tasks:delete"
  | "comments:create"
  // Availability
  | "availability:create"
  | "availability:read"
  | "availability:update"
  | "availability:delete"
  | "recurring:create"
  | "recurring:read"
  | "recurring:update"
  | "recurring:delete"
  // Live Events & Assignments
  | "live_events:create"
  | "live_events:read"
  | "live_events:update"
  | "assignments:create"
  | "assignments:update"
  | "assignments:delete"
  // Members, Roles & Coverage
  | "members:create"
  | "members:read"
  | "members:update"
  | "coverage:create"
  | "coverage:read"
  // Special Requests
  | "special_requests:create"
  | "special_requests:read"
  | "special_requests:update"
  // Discord Configuration
  | "discord_config:read"
  | "discord_config:create"
  | "discord_config:update"
  | "discord_config:delete"
  // Onboarding Invites
  | "invites:create"
  | "invites:read"
  | "invites:update"
  // Dashboard
  | "dashboard:read"
  // Reminder Preferences
  | "reminders:create"
  | "reminders:read"
  // Work Submissions
  | "work_submissions:create"
  | "work_submissions:read";

type Scope = "global" | "section_scoped" | "self_only";

interface PermissionEntry {
  owner: boolean;
  operations_lead: boolean;
  section_lead: boolean;
  member: boolean;
  scope: Scope;
}

const PERMISSION_MATRIX: Record<PermissionAction, PermissionEntry> = {
  // ── Tasks & Comments ──────────────────────────────────────────────────────
  "tasks:create":        { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "section_scoped" },
  "tasks:read":          { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "section_scoped" },
  "tasks:update":        { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "section_scoped" },
  "tasks:delete":        { owner: true, operations_lead: true, section_lead: true, member: false, scope: "section_scoped" },
  "comments:create":     { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "section_scoped" },

  // ── Availability ──────────────────────────────────────────────────────────
  "availability:create":  { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "self_only" },
  "availability:read":    { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "section_scoped" },
  "availability:update":  { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "self_only" },
  "availability:delete":  { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "self_only" },
  "recurring:create":     { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "self_only" },
  "recurring:read":       { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "self_only" },
  "recurring:update":     { owner: true, operations_lead: true, section_lead: true, member: true, scope: "self_only" },
  "recurring:delete":     { owner: true, operations_lead: true, section_lead: true, member: true, scope: "self_only" },

  // ── Live Events & Assignments ─────────────────────────────────────────────
  "live_events:create":   { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },
  "live_events:read":     { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "global" },
  "live_events:update":   { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },
  "assignments:create":   { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },
  "assignments:update":   { owner: true, operations_lead: true, section_lead: false, member: true,  scope: "self_only" },
  "assignments:delete":   { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },

  // ── Members, Roles & Coverage ─────────────────────────────────────────────
  "members:create":       { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },
  "members:read":         { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "global" },
  "members:update":       { owner: true, operations_lead: true, section_lead: false, member: true,  scope: "self_only" },
  "coverage:create":      { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },
  "coverage:read":        { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "global" },

  // ── Special Requests ──────────────────────────────────────────────────────
  "special_requests:create":  { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "global" },
  "special_requests:read":    { owner: true, operations_lead: true, section_lead: true, member: true,  scope: "section_scoped" },
  "special_requests:update":  { owner: true, operations_lead: true, section_lead: true, member: false, scope: "self_only" },

  // ── Discord Configuration ─────────────────────────────────────────────────
  "discord_config:read":   { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },
  "discord_config:create": { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },
  "discord_config:update": { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },
  "discord_config:delete": { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },

  // ── Onboarding Invites ────────────────────────────────────────────────────
  "invites:create":  { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },
  "invites:read":    { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },
  "invites:update":  { owner: true, operations_lead: true, section_lead: false, member: false, scope: "global" },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  "dashboard:read":  { owner: true, operations_lead: true, section_lead: true, member: true, scope: "global" },

  // ── Reminder Preferences ──────────────────────────────────────────────────
  "reminders:create": { owner: true, operations_lead: true, section_lead: true, member: true, scope: "self_only" },
  "reminders:read":   { owner: true, operations_lead: true, section_lead: true, member: true, scope: "self_only" },

  // ── Work Submissions ──────────────────────────────────────────────────────
  "work_submissions:create": { owner: true, operations_lead: true, section_lead: true, member: true, scope: "self_only" },
  "work_submissions:read":   { owner: true, operations_lead: true, section_lead: true, member: true, scope: "global" },
};

// ─── Role Helpers ────────────────────────────────────────────────────────────

export function isGlobalOperator(access: CurrentAccess): boolean {
  return access.globalRoles.includes("owner") || access.globalRoles.includes("operations_lead");
}

export function isOwner(access: CurrentAccess): boolean {
  return access.globalRoles.includes("owner");
}

export function isSectionLead(access: CurrentAccess, section?: SectionKey): boolean {
  if (isGlobalOperator(access)) return true;
  if (!section) return access.sections.some((s) => s.role === "lead");
  return access.sections.some((s) => s.section === section && s.role === "lead");
}

export function isMember(access: CurrentAccess): boolean {
  return isGlobalOperator(access) || access.globalRoles.includes("member") || access.sections.length > 0;
}

export function canWorkInSection(access: CurrentAccess, section?: SectionKey): boolean {
  if (isGlobalOperator(access)) return true;
  if (!section) return true;
  return access.sections.some((membership) => membership.section === section);
}

/**
 * Get the effective role level for permission checking.
 * Returns the highest role the user holds.
 */
export function getEffectiveRole(access: CurrentAccess): "owner" | "operations_lead" | "section_lead" | "member" {
  if (isOwner(access)) return "owner";
  if (isGlobalOperator(access)) return "operations_lead";
  if (access.sections.some((s) => s.role === "lead")) return "section_lead";
  return "member";
}

// ─── Permission Checking ─────────────────────────────────────────────────────

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a user has permission to perform an action on a resource.
 *
 * @param access - The user's current access context
 * @param action - The permission action to check
 * @param options - Additional context for the check
 * @returns PermissionCheckResult with allowed status and optional reason
 */
export function checkPermission(
  access: CurrentAccess,
  action: PermissionAction,
  options: {
    /** The section the resource belongs to */
    section?: SectionKey;
    /** The user ID of the resource owner (for self_only checks) */
    resourceOwnerId?: string;
    /** Override the scope check (e.g., for member updates that are always self_only) */
    scopeOverride?: Scope;
  } = {},
): PermissionCheckResult {
  const entry = PERMISSION_MATRIX[action];
  if (!entry) {
    return { allowed: false, reason: `Unknown permission action: ${action}` };
  }

  // Unauthenticated users have no permissions
  if (access.globalRoles.length === 0 && access.sections.length === 0) {
    return { allowed: false, reason: "Unauthenticated users have no permissions" };
  }

  const role = getEffectiveRole(access);
  const roleAllowed = entry[role as keyof Omit<PermissionEntry, "scope">];

  if (!roleAllowed) {
    return { allowed: false, reason: `Role '${role}' does not have '${action}' permission` };
  }

  const scope = options.scopeOverride ?? entry.scope;

  // Global scope - no additional checks needed
  if (scope === "global") {
    return { allowed: true };
  }

  // Self-only scope - check resource ownership
  if (scope === "self_only") {
    if (isGlobalOperator(access)) {
      return { allowed: true };
    }
    if (!options.resourceOwnerId) {
      return { allowed: false, reason: "Resource owner ID required for self-only action" };
    }
    if (options.resourceOwnerId !== access.userId) {
      return { allowed: false, reason: "Can only perform this action on your own resources" };
    }
    return { allowed: true };
  }

  // Section-scoped - check section membership
  if (scope === "section_scoped") {
    if (isGlobalOperator(access)) {
      return { allowed: true };
    }
    if (!options.section) {
      return { allowed: false, reason: "Section required for section-scoped action" };
    }
    if (!canWorkInSection(access, options.section)) {
      return { allowed: false, reason: `Not a member of section '${options.section}'` };
    }
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Convenience function to check if a user can perform an action.
 * Returns true if allowed, false otherwise.
 */
export function canPerform(
  access: CurrentAccess,
  action: PermissionAction,
  options: {
    section?: SectionKey;
    resourceOwnerId?: string;
    scopeOverride?: Scope;
  } = {},
): boolean {
  return checkPermission(access, action, options).allowed;
}

// ─── Session Helpers ─────────────────────────────────────────────────────────

export async function requireCurrentUser(): Promise<AccessResult> {
  const result = await requireDiscordVerifiedUser();
  if ("response" in result) return result;

  const { userId, user } = result;
  if (user.onboardingStatus !== "verified" || user.status !== "active") {
    return { response: NextResponse.json({ error: "Dashboard onboarding required" }, { status: 403 }) };
  }

  return {
    access: {
      userId,
      globalRoles: user.globalRoles.map((assignment) => assignment.role.key),
      sections: user.sectionMemberships.map((membership) => ({
        section: membership.section.key,
        role: membership.role,
      })),
    },
  };
}

export async function requireDiscordVerifiedUser(): Promise<VerifiedDiscordResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      discordServerVerified: true,
      onboardingStatus: true,
      status: true,
      globalRoles: { select: { role: { select: { key: true } } } },
      sectionMemberships: {
        select: {
          role: true,
          section: { select: { key: true } },
        },
      },
    },
  });

  if (!user || !user.discordServerVerified) {
    return { response: NextResponse.json({ error: "Discord server verification required" }, { status: 403 }) };
  }

  return { userId, user };
}

export async function requireGlobalOperator(): Promise<AccessResult> {
  const result = await requireCurrentUser();
  if ("response" in result) return result;

  if (!isGlobalOperator(result.access)) {
    return { response: NextResponse.json({ error: "Owner or operations lead access required" }, { status: 403 }) };
  }

  return result;
}

/**
 * Require a specific permission. Returns AccessResult with error response if denied.
 */
export async function requirePermission(
  action: PermissionAction,
  options: {
    section?: SectionKey;
    resourceOwnerId?: string;
    scopeOverride?: Scope;
  } = {},
): Promise<AccessResult> {
  const result = await requireCurrentUser();
  if ("response" in result) return result;

  const check = checkPermission(result.access, action, options);
  if (!check.allowed) {
    return { response: NextResponse.json({ error: check.reason ?? "Permission denied" }, { status: 403 }) };
  }

  return result;
}

export function deriveCreatedByRole(globalRoles: string[]): "owner" | "operations" {
  return globalRoles.includes("owner") ? "owner" : "operations";
}
