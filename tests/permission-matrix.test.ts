import { describe, it, expect } from "vitest";
import {
  checkPermission,
  canPerform,
  isGlobalOperator,
  isOwner,
  isSectionLead,
  isMember,
  canWorkInSection,
  getEffectiveRole,
  type CurrentAccess,
  type PermissionAction,
} from "../src/server/permissions";

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeAccess(overrides: Partial<CurrentAccess> = {}): CurrentAccess {
  return {
    userId: "user-1",
    globalRoles: [],
    sections: [],
    ...overrides,
  };
}

const OWNER = makeAccess({ globalRoles: ["owner"] });
const OPS_LEAD = makeAccess({ globalRoles: ["operations_lead"] });
const SECTION_LEAD = makeAccess({
  globalRoles: ["member"],
  sections: [{ section: "forecasting", role: "lead" }],
});
const MEMBER = makeAccess({
  globalRoles: ["member"],
  sections: [{ section: "forecasting", role: "member" }],
});
const UNAUTHENTICATED = makeAccess({ globalRoles: [], sections: [] });

// ─── Role Helper Tests ──────────────────────────────────────────────────────

describe("isGlobalOperator", () => {
  it("returns true for owner", () => {
    expect(isGlobalOperator(OWNER)).toBe(true);
  });

  it("returns true for operations_lead", () => {
    expect(isGlobalOperator(OPS_LEAD)).toBe(true);
  });

  it("returns false for section lead", () => {
    expect(isGlobalOperator(SECTION_LEAD)).toBe(false);
  });

  it("returns false for member", () => {
    expect(isGlobalOperator(MEMBER)).toBe(false);
  });

  it("returns false for unauthenticated", () => {
    expect(isGlobalOperator(UNAUTHENTICATED)).toBe(false);
  });
});

describe("isOwner", () => {
  it("returns true for owner", () => {
    expect(isOwner(OWNER)).toBe(true);
  });

  it("returns false for operations_lead", () => {
    expect(isOwner(OPS_LEAD)).toBe(false);
  });

  it("returns false for member", () => {
    expect(isOwner(MEMBER)).toBe(false);
  });
});

describe("isSectionLead", () => {
  it("returns true for global operator", () => {
    expect(isSectionLead(OWNER)).toBe(true);
    expect(isSectionLead(OPS_LEAD)).toBe(true);
  });

  it("returns true for section lead in their section", () => {
    expect(isSectionLead(SECTION_LEAD, "forecasting")).toBe(true);
  });

  it("returns false for section lead in other section", () => {
    expect(isSectionLead(SECTION_LEAD, "graphics")).toBe(false);
  });

  it("returns false for member", () => {
    expect(isSectionLead(MEMBER)).toBe(false);
  });

  it("returns true when checking any section for lead with section", () => {
    expect(isSectionLead(SECTION_LEAD)).toBe(true);
  });
});

describe("isMember", () => {
  it("returns true for global operator", () => {
    expect(isMember(OWNER)).toBe(true);
  });

  it("returns true for section lead", () => {
    expect(isMember(SECTION_LEAD)).toBe(true);
  });

  it("returns true for member", () => {
    expect(isMember(MEMBER)).toBe(true);
  });

  it("returns false for unauthenticated", () => {
    expect(isMember(UNAUTHENTICATED)).toBe(false);
  });
});

describe("canWorkInSection", () => {
  it("returns true for global operator in any section", () => {
    expect(canWorkInSection(OWNER, "forecasting")).toBe(true);
    expect(canWorkInSection(OWNER, "graphics")).toBe(true);
  });

  it("returns true for member in their section", () => {
    expect(canWorkInSection(MEMBER, "forecasting")).toBe(true);
  });

  it("returns false for member in other section", () => {
    expect(canWorkInSection(MEMBER, "graphics")).toBe(false);
  });

  it("returns true when no section specified", () => {
    expect(canWorkInSection(MEMBER)).toBe(true);
  });
});

describe("getEffectiveRole", () => {
  it("returns owner for owner", () => {
    expect(getEffectiveRole(OWNER)).toBe("owner");
  });

  it("returns operations_lead for operations_lead", () => {
    expect(getEffectiveRole(OPS_LEAD)).toBe("operations_lead");
  });

  it("returns section_lead for section lead", () => {
    expect(getEffectiveRole(SECTION_LEAD)).toBe("section_lead");
  });

  it("returns member for member", () => {
    expect(getEffectiveRole(MEMBER)).toBe("member");
  });
});

// ─── Permission Matrix Tests ────────────────────────────────────────────────

describe("checkPermission", () => {
  describe("tasks", () => {
    it("allows owner to create tasks", () => {
      expect(checkPermission(OWNER, "tasks:create").allowed).toBe(true);
    });

    it("allows member to create tasks in their section", () => {
      expect(checkPermission(MEMBER, "tasks:create", { section: "forecasting" }).allowed).toBe(true);
    });

    it("denies member creating tasks in other section", () => {
      expect(checkPermission(MEMBER, "tasks:create", { section: "graphics" }).allowed).toBe(false);
    });

    it("allows owner to update any task", () => {
      expect(checkPermission(OWNER, "tasks:update").allowed).toBe(true);
    });

    it("allows section lead to update tasks in their section", () => {
      expect(checkPermission(SECTION_LEAD, "tasks:update", { section: "forecasting" }).allowed).toBe(true);
    });

    it("allows member to update tasks in their section", () => {
      expect(checkPermission(MEMBER, "tasks:update", { section: "forecasting" }).allowed).toBe(true);
    });

    it("allows owner to delete tasks", () => {
      expect(checkPermission(OWNER, "tasks:delete").allowed).toBe(true);
    });

    it("allows section lead to delete tasks in their section", () => {
      expect(checkPermission(SECTION_LEAD, "tasks:delete", { section: "forecasting" }).allowed).toBe(true);
    });

    it("denies member deleting tasks", () => {
      expect(checkPermission(MEMBER, "tasks:delete").allowed).toBe(false);
    });

    it("allows member to create comments in their section", () => {
      expect(checkPermission(MEMBER, "comments:create", { section: "forecasting" }).allowed).toBe(true);
    });
  });

  describe("availability", () => {
    it("allows member to create own availability", () => {
      expect(checkPermission(MEMBER, "availability:create", { resourceOwnerId: "user-1" }).allowed).toBe(true);
    });

    it("denies member creating availability for others", () => {
      expect(checkPermission(MEMBER, "availability:create", { resourceOwnerId: "user-2" }).allowed).toBe(false);
    });

    it("allows operator to create availability for others", () => {
      expect(checkPermission(OWNER, "availability:create", { resourceOwnerId: "user-2" }).allowed).toBe(true);
    });

    it("allows member to update own availability", () => {
      expect(checkPermission(MEMBER, "availability:update", { resourceOwnerId: "user-1" }).allowed).toBe(true);
    });

    it("denies member updating availability for others", () => {
      expect(checkPermission(MEMBER, "availability:update", { resourceOwnerId: "user-2" }).allowed).toBe(false);
    });

    it("allows member to delete own availability", () => {
      expect(checkPermission(MEMBER, "availability:delete", { resourceOwnerId: "user-1" }).allowed).toBe(true);
    });

    it("denies member deleting availability for others", () => {
      expect(checkPermission(MEMBER, "availability:delete", { resourceOwnerId: "user-2" }).allowed).toBe(false);
    });
  });

  describe("live events", () => {
    it("allows owner to create events", () => {
      expect(checkPermission(OWNER, "live_events:create").allowed).toBe(true);
    });

    it("denies member creating events", () => {
      expect(checkPermission(MEMBER, "live_events:create").allowed).toBe(false);
    });

    it("allows member to read events", () => {
      expect(checkPermission(MEMBER, "live_events:read").allowed).toBe(true);
    });

    it("allows owner to update events", () => {
      expect(checkPermission(OWNER, "live_events:update").allowed).toBe(true);
    });

    it("denies member updating events", () => {
      expect(checkPermission(MEMBER, "live_events:update").allowed).toBe(false);
    });

    it("allows owner to create assignments", () => {
      expect(checkPermission(OWNER, "assignments:create").allowed).toBe(true);
    });

    it("denies member creating assignments", () => {
      expect(checkPermission(MEMBER, "assignments:create").allowed).toBe(false);
    });

    it("allows member to update own assignment", () => {
      expect(checkPermission(MEMBER, "assignments:update", { resourceOwnerId: "user-1" }).allowed).toBe(true);
    });

    it("denies member updating others assignments", () => {
      expect(checkPermission(MEMBER, "assignments:update", { resourceOwnerId: "user-2" }).allowed).toBe(false);
    });
  });

  describe("members", () => {
    it("allows owner to create members", () => {
      expect(checkPermission(OWNER, "members:create").allowed).toBe(true);
    });

    it("denies member creating members", () => {
      expect(checkPermission(MEMBER, "members:create").allowed).toBe(false);
    });

    it("allows member to read members", () => {
      expect(checkPermission(MEMBER, "members:read").allowed).toBe(true);
    });

    it("allows member to update own profile", () => {
      expect(checkPermission(MEMBER, "members:update", { resourceOwnerId: "user-1" }).allowed).toBe(true);
    });

    it("denies member updating others profiles", () => {
      expect(checkPermission(MEMBER, "members:update", { resourceOwnerId: "user-2" }).allowed).toBe(false);
    });

    it("allows operator to update any member", () => {
      expect(checkPermission(OWNER, "members:update", { resourceOwnerId: "user-2" }).allowed).toBe(true);
    });
  });

  describe("special requests", () => {
    it("allows member to create special requests", () => {
      expect(checkPermission(MEMBER, "special_requests:create").allowed).toBe(true);
    });

    it("allows member to read requests in their section", () => {
      expect(checkPermission(MEMBER, "special_requests:read", { section: "forecasting" }).allowed).toBe(true);
    });

    it("allows operator to update any request", () => {
      expect(checkPermission(OWNER, "special_requests:update", { resourceOwnerId: "user-2" }).allowed).toBe(true);
    });

    it("allows section lead to update requests in their section", () => {
      expect(checkPermission(SECTION_LEAD, "special_requests:update", { resourceOwnerId: "user-1" }).allowed).toBe(true);
    });
  });

  describe("discord config", () => {
    it("allows owner to read config", () => {
      expect(checkPermission(OWNER, "discord_config:read").allowed).toBe(true);
    });

    it("denies member reading config", () => {
      expect(checkPermission(MEMBER, "discord_config:read").allowed).toBe(false);
    });

    it("allows owner to create config", () => {
      expect(checkPermission(OWNER, "discord_config:create").allowed).toBe(true);
    });

    it("denies member creating config", () => {
      expect(checkPermission(MEMBER, "discord_config:create").allowed).toBe(false);
    });
  });

  describe("invites", () => {
    it("allows owner to create invites", () => {
      expect(checkPermission(OWNER, "invites:create").allowed).toBe(true);
    });

    it("denies member creating invites", () => {
      expect(checkPermission(MEMBER, "invites:create").allowed).toBe(false);
    });

    it("allows owner to update invites", () => {
      expect(checkPermission(OWNER, "invites:update").allowed).toBe(true);
    });

    it("denies member updating invites", () => {
      expect(checkPermission(MEMBER, "invites:update").allowed).toBe(false);
    });
  });

  describe("dashboard", () => {
    it("allows all roles to read dashboard", () => {
      expect(checkPermission(OWNER, "dashboard:read").allowed).toBe(true);
      expect(checkPermission(OPS_LEAD, "dashboard:read").allowed).toBe(true);
      expect(checkPermission(SECTION_LEAD, "dashboard:read").allowed).toBe(true);
      expect(checkPermission(MEMBER, "dashboard:read").allowed).toBe(true);
    });
  });

  describe("reminders", () => {
    it("allows member to create own reminders", () => {
      expect(checkPermission(MEMBER, "reminders:create", { resourceOwnerId: "user-1" }).allowed).toBe(true);
    });

    it("denies member creating reminders for others", () => {
      expect(checkPermission(MEMBER, "reminders:create", { resourceOwnerId: "user-2" }).allowed).toBe(false);
    });

    it("allows operator to create reminders for others", () => {
      expect(checkPermission(OWNER, "reminders:create", { resourceOwnerId: "user-2" }).allowed).toBe(true);
    });
  });

  describe("work submissions", () => {
    it("allows member to create own submissions", () => {
      expect(checkPermission(MEMBER, "work_submissions:create", { resourceOwnerId: "user-1" }).allowed).toBe(true);
    });

    it("denies member creating submissions for others", () => {
      expect(checkPermission(MEMBER, "work_submissions:create", { resourceOwnerId: "user-2" }).allowed).toBe(false);
    });

    it("allows operator to create submissions for others", () => {
      expect(checkPermission(OWNER, "work_submissions:create", { resourceOwnerId: "user-2" }).allowed).toBe(true);
    });
  });

  describe("coverage", () => {
    it("allows owner to create coverage", () => {
      expect(checkPermission(OWNER, "coverage:create").allowed).toBe(true);
    });

    it("denies member creating coverage", () => {
      expect(checkPermission(MEMBER, "coverage:create").allowed).toBe(false);
    });

    it("allows member to read coverage", () => {
      expect(checkPermission(MEMBER, "coverage:read").allowed).toBe(true);
    });
  });
});

// ─── canPerform Convenience Tests ───────────────────────────────────────────

describe("canPerform", () => {
  it("returns true for allowed action", () => {
    expect(canPerform(MEMBER, "tasks:create", { section: "forecasting" })).toBe(true);
  });

  it("returns false for denied action", () => {
    expect(canPerform(MEMBER, "tasks:delete")).toBe(false);
  });
});

// ─── Unauthenticated User Tests ─────────────────────────────────────────────

describe("unauthenticated user", () => {
  it("denies all actions for unauthenticated user", () => {
    expect(checkPermission(UNAUTHENTICATED, "tasks:create").allowed).toBe(false);
    expect(checkPermission(UNAUTHENTICATED, "tasks:read").allowed).toBe(false);
    expect(checkPermission(UNAUTHENTICATED, "availability:create").allowed).toBe(false);
    expect(checkPermission(UNAUTHENTICATED, "live_events:create").allowed).toBe(false);
    expect(checkPermission(UNAUTHENTICATED, "members:create").allowed).toBe(false);
    expect(checkPermission(UNAUTHENTICATED, "discord_config:read").allowed).toBe(false);
    expect(checkPermission(UNAUTHENTICATED, "invites:create").allowed).toBe(false);
    expect(checkPermission(UNAUTHENTICATED, "dashboard:read").allowed).toBe(false);
  });
});

// ─── Cross-Role Comparison Tests ────────────────────────────────────────────

describe("permission escalation prevention", () => {
  it("member cannot perform operator-only actions", () => {
    expect(canPerform(MEMBER, "live_events:create")).toBe(false);
    expect(canPerform(MEMBER, "members:create")).toBe(false);
    expect(canPerform(MEMBER, "coverage:create")).toBe(false);
    expect(canPerform(MEMBER, "discord_config:create")).toBe(false);
    expect(canPerform(MEMBER, "invites:create")).toBe(false);
  });

  it("section lead cannot perform operator-only actions", () => {
    expect(canPerform(SECTION_LEAD, "live_events:create")).toBe(false);
    expect(canPerform(SECTION_LEAD, "members:create")).toBe(false);
    expect(canPerform(SECTION_LEAD, "coverage:create")).toBe(false);
    expect(canPerform(SECTION_LEAD, "discord_config:create")).toBe(false);
    expect(canPerform(SECTION_LEAD, "invites:create")).toBe(false);
  });

  it("member cannot delete tasks", () => {
    expect(canPerform(MEMBER, "tasks:delete")).toBe(false);
  });

  it("section lead can delete tasks in their section", () => {
    expect(canPerform(SECTION_LEAD, "tasks:delete", { section: "forecasting" })).toBe(true);
  });

  it("member cannot update other members profiles", () => {
    expect(canPerform(MEMBER, "members:update", { resourceOwnerId: "other-user" })).toBe(false);
  });

  it("member can update own profile", () => {
    expect(canPerform(MEMBER, "members:update", { resourceOwnerId: "user-1" })).toBe(true);
  });
});
