import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OnboardingInvite } from "../src/types";

const mockPrismaFindMany = vi.fn();

vi.mock("../src/db", () => ({
  get prisma() {
    return {
      user: { findMany: (...args: unknown[]) => mockPrismaFindMany("user", ...args) },
      availabilityWindow: { findMany: (...args: unknown[]) => mockPrismaFindMany("availabilityWindow", ...args) },
      recurringAvailability: { findMany: (...args: unknown[]) => mockPrismaFindMany("recurringAvailability", ...args) },
      liveEvent: { findMany: (...args: unknown[]) => mockPrismaFindMany("liveEvent", ...args) },
      temporaryRoleCoverage: { findMany: (...args: unknown[]) => mockPrismaFindMany("temporaryRoleCoverage", ...args) },
      workSubmission: { findMany: (...args: unknown[]) => mockPrismaFindMany("workSubmission", ...args) },
      onboardingInvite: { findMany: (...args: unknown[]) => mockPrismaFindMany("onboardingInvite", ...args) },
      reminderPreference: { findMany: (...args: unknown[]) => mockPrismaFindMany("reminderPreference", ...args) },
      specialRequest: { findMany: (...args: unknown[]) => mockPrismaFindMany("specialRequest", ...args) },
    };
  },
}));

vi.mock("../src/server/leantime", () => ({
  fetchLeantimeTasks: vi.fn().mockResolvedValue({ configured: false, tasks: [] }),
}));

const mockRequireCurrentUser = vi.fn();
const mockIsGlobalOperator = vi.fn();

vi.mock("../src/server/permissions", () => ({
  get requireCurrentUser() {
    return (...args: unknown[]) => mockRequireCurrentUser(...args);
  },
  get isGlobalOperator() {
    return (...args: unknown[]) => mockIsGlobalOperator(...args);
  },
}));

function stubUser(overrides?: { sectionKey?: string }) {
  return {
    id: "u1",
    name: "Test User",
    handle: "testuser",
    discordHandle: null,
    email: null,
    discordUserId: "123",
    onboardingStatus: "verified" as const,
    globalRoles: [{ role: { key: "member" } }],
    sectionMemberships: [{ role: "member" as const, section: { key: overrides?.sectionKey ?? "forecasting" } }],
    createdAt: new Date(),
  };
}

function stubAvailabilityWindow() {
  return {
    id: "aw1",
    userId: "u1",
    status: "available" as const,
    helpRole: "Forecasting",
    startsAt: new Date("2026-01-01T10:00:00Z"),
    endsAt: new Date("2026-01-01T18:00:00Z"),
    notes: "Available",
    section: { key: "forecasting" },
  };
}

function stubInvite(): OnboardingInvite {
  return {
    id: "inv1",
    token: "secret-token-abc",
    label: "New member invite",
    createdByRole: "operations",
    createdAt: "1/1/2026",
    status: "open",
  };
}

function stubReminderPreference() {
  return {
    id: "rp1",
    userId: "u1",
    frequency: "daily" as const,
    sendClearForDay: true,
    taskReminders: true,
    liveEventReminders: true,
    specialRequestReminders: true,
    preferredDays: ["Mon"],
    preferredTimes: ["09:00"],
    preferredPlatforms: ["discord"],
    preferredContentTypes: ["social_graphic"],
    notes: "",
  };
}

function stubSpecialRequest() {
  return {
    id: "sr1",
    targetUserId: "u2",
    createdById: "u1",
    title: "Need graphics help",
    prompt: "Can someone make a graphic?",
    role: "Graphics Lead",
    platform: "discord",
    dueAt: new Date("2026-01-02"),
    status: "open" as const,
    responseNote: "",
    createdAt: new Date("2026-01-01"),
  };
}

function stubAllEmpty() {
  mockPrismaFindMany.mockImplementation((table: string) => {
    if (table === "user") return Promise.resolve([stubUser()]);
    if (table === "availabilityWindow") return Promise.resolve([]);
    if (table === "workSubmission") return Promise.resolve([]);
    if (table === "temporaryRoleCoverage") return Promise.resolve([]);
    if (table === "liveEvent") return Promise.resolve([]);
    if (table === "recurringAvailability") return Promise.resolve([]);
    if (table === "onboardingInvite") return Promise.resolve([]);
    if (table === "reminderPreference") return Promise.resolve([]);
    if (table === "specialRequest") return Promise.resolve([]);
    return Promise.resolve([]);
  });
}

describe("dashboard data scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("member payload excludes invites, reminderPreferences, and specialRequests", async () => {
    stubAllEmpty();

    const { getMemberDashboardData } = await import("../src/server/dashboard-data");
    const data = await getMemberDashboardData();

    expect(data).toHaveProperty("members");
    expect(data).toHaveProperty("tasks");
    expect(data).toHaveProperty("availability");
    expect(data).toHaveProperty("recurringSchedules");
    expect(data).toHaveProperty("liveEvents");
    expect(data).toHaveProperty("coverage");
    expect(data).toHaveProperty("workSubmissions");

    expect(data).not.toHaveProperty("invites");
    expect(data).not.toHaveProperty("reminderPreferences");
    expect(data).not.toHaveProperty("specialRequests");
  });

  it("member payload strips token and discordUserId from member objects", async () => {
    stubAllEmpty();

    const { getMemberDashboardData } = await import("../src/server/dashboard-data");
    const data = await getMemberDashboardData();

    const member = data.members[0];
    expect(member).toEqual({
      id: "u1",
      name: "Test User",
      handle: "testuser",
      sections: [{ section: "forecasting", role: "member" }],
    });
    expect(member).not.toHaveProperty("discordUserId");
    expect(member).not.toHaveProperty("globalRoles");
    expect(member).not.toHaveProperty("onboardingStatus");
  });

  it("operator payload includes invites without token field", async () => {
    mockPrismaFindMany.mockImplementation((table: string) => {
      if (table === "user") return Promise.resolve([stubUser()]);
      if (table === "availabilityWindow") return Promise.resolve([]);
      if (table === "workSubmission") return Promise.resolve([]);
      if (table === "temporaryRoleCoverage") return Promise.resolve([]);
      if (table === "liveEvent") return Promise.resolve([]);
      if (table === "recurringAvailability") return Promise.resolve([]);
      if (table === "onboardingInvite") return Promise.resolve([stubInvite()]);
      if (table === "reminderPreference") return Promise.resolve([]);
      if (table === "specialRequest") return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const { getOperatorDashboardData } = await import("../src/server/dashboard-data");
    const data = await getOperatorDashboardData();

    expect(data.invites).toHaveLength(1);
    const invite = data.invites[0];
    expect(invite).toHaveProperty("id", "inv1");
    expect(invite).toHaveProperty("label", "New member invite");
    expect(invite).toHaveProperty("status", "open");
    expect(invite).not.toHaveProperty("token");
  });

  it("operator payload includes all admin fields", async () => {
    mockPrismaFindMany.mockImplementation((table: string) => {
      if (table === "user") return Promise.resolve([stubUser()]);
      if (table === "availabilityWindow") return Promise.resolve([]);
      if (table === "workSubmission") return Promise.resolve([]);
      if (table === "temporaryRoleCoverage") return Promise.resolve([]);
      if (table === "liveEvent") return Promise.resolve([]);
      if (table === "recurringAvailability") return Promise.resolve([]);
      if (table === "onboardingInvite") return Promise.resolve([]);
      if (table === "reminderPreference") return Promise.resolve([stubReminderPreference()]);
      if (table === "specialRequest") return Promise.resolve([stubSpecialRequest()]);
      return Promise.resolve([]);
    });

    const { getOperatorDashboardData } = await import("../src/server/dashboard-data");
    const data = await getOperatorDashboardData();

    expect(data).toHaveProperty("invites");
    expect(data).toHaveProperty("reminderPreferences");
    expect(data).toHaveProperty("specialRequests");
    expect(data.reminderPreferences).toHaveLength(1);
    expect(data.specialRequests).toHaveLength(1);
  });
});

describe("API route role-based branching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls getMemberDashboardData for member role", async () => {
    mockRequireCurrentUser.mockResolvedValue({
      access: { userId: "u1", globalRoles: ["member"], sections: [] },
    });
    mockIsGlobalOperator.mockReturnValue(false);
    stubAllEmpty();

    const { GET } = await import("../app/api/dashboard/route");
    const response = await GET();
    const data = await response.json();

    expect(data).not.toHaveProperty("invites");
    expect(data).not.toHaveProperty("reminderPreferences");
    expect(data).not.toHaveProperty("specialRequests");
  });

  it("calls getOperatorDashboardData for operator role", async () => {
    mockRequireCurrentUser.mockResolvedValue({
      access: { userId: "u1", globalRoles: ["owner"], sections: [] },
    });
    mockIsGlobalOperator.mockReturnValue(true);
    stubAllEmpty();

    const { GET } = await import("../app/api/dashboard/route");
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty("invites");
    expect(data).toHaveProperty("reminderPreferences");
    expect(data).toHaveProperty("specialRequests");
  });
});

describe("isGlobalOperator", () => {
  it("returns true for owner role", () => {
    const access = { userId: "u1", globalRoles: ["owner"], sections: [] as never[] };
    expect(access.globalRoles.includes("owner") || access.globalRoles.includes("operations_lead")).toBe(true);
  });

  it("returns true for operations_lead role", () => {
    const access = { userId: "u1", globalRoles: ["operations_lead"], sections: [] as never[] };
    expect(access.globalRoles.includes("owner") || access.globalRoles.includes("operations_lead")).toBe(true);
  });

  it("returns true when user has both owner and member roles", () => {
    const access = { userId: "u1", globalRoles: ["owner", "member"], sections: [] as never[] };
    expect(access.globalRoles.includes("owner") || access.globalRoles.includes("operations_lead")).toBe(true);
  });

  it("returns false for member role only", () => {
    const access = { userId: "u1", globalRoles: ["member"], sections: [] as never[] };
    expect(access.globalRoles.includes("owner") || access.globalRoles.includes("operations_lead")).toBe(false);
  });

  it("returns false for empty roles", () => {
    const access = { userId: "u1", globalRoles: [], sections: [] as never[] };
    expect(access.globalRoles.includes("owner") || access.globalRoles.includes("operations_lead")).toBe(false);
  });
});
