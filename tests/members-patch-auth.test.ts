import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CurrentAccess } from "../src/server/permissions";

const mockGetServerSession = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock("../src/auth", () => ({
  authOptions: {},
}));

const mockPrismaTransaction = vi.fn();
const mockPrismaUserUpdate = vi.fn();
const mockPrismaUserFindUnique = vi.fn();
const mockPrismaUserFindUniqueOrThrow = vi.fn();

vi.mock("../src/db", () => ({
  get prisma() {
    return {
      get $transaction() {
        return mockPrismaTransaction;
      },
      user: {
        get update() {
          return mockPrismaUserUpdate;
        },
        get findUnique() {
          return mockPrismaUserFindUnique;
        },
        get findUniqueOrThrow() {
          return mockPrismaUserFindUniqueOrThrow;
        },
      },
    };
  },
}));

function mockSession(userId: string, globalRoles: string[] = ["member"]) {
  mockGetServerSession.mockResolvedValue({
    user: {
      id: userId,
      globalRoles,
    },
  });
}

function mockDiscordVerifiedUser(
  userId: string,
  options: {
    globalRoles?: string[];
    onboardingStatus?: "pending" | "verified";
    status?: "active" | "inactive" | "invited";
    sections?: Array<{ section: string; role: string }>;
  } = {},
) {
  const user = {
    discordServerVerified: true,
    onboardingStatus: options.onboardingStatus ?? "verified",
    status: options.status ?? "active",
    globalRoles: (options.globalRoles ?? ["member"]).map((key) => ({ role: { key } })),
    sectionMemberships: (options.sections ?? []).map((s) => ({
      role: s.role as "lead" | "member",
      section: { key: s.section },
    })),
  };

  mockPrismaUserFindUnique.mockResolvedValue(user);
  return user;
}

interface TransactionMock {
  user: {
    update: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
  };
  globalRole: { findUnique: ReturnType<typeof vi.fn> };
  userGlobalRole: { upsert: ReturnType<typeof vi.fn> };
  section: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  sectionMembership: { upsert: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
}

function mockTransaction(finalUser?: unknown) {
  const tx: TransactionMock = {
    user: {
      update: vi.fn().mockResolvedValue({}),
      findUniqueOrThrow: vi.fn(),
    },
    globalRole: {
      findUnique: vi.fn(),
    },
    userGlobalRole: {
      upsert: vi.fn(),
    },
    section: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    sectionMembership: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  mockPrismaTransaction.mockImplementation(async (fn: (t: TransactionMock) => Promise<unknown>) => {
    return fn(tx);
  });

  if (finalUser) {
    tx.user.findUniqueOrThrow.mockResolvedValue(finalUser);
  }

  return tx;
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-member-1",
    name: "Test User",
    handle: "testuser",
    discordHandle: "TestUser#1234",
    email: "test@example.com",
    discordUserId: "discord-123",
    onboardingStatus: "verified",
    globalRoles: [{ role: { key: "member" } }],
    sectionMemberships: [{ role: "member", section: { key: "forecasting" } }],
    ...overrides,
  };
}

async function callPatch(memberId: string, body: Record<string, unknown>) {
  const { PATCH } = await import("../app/api/members/[memberId]/route");
  const request = new Request("http://localhost/api/members/" + memberId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ memberId }) });
}

describe("PATCH /api/members/:memberId - authorization", () => {
  const MEMBER_ID = "user-member-1";
  const OTHER_MEMBER_ID = "user-other-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("self-service profile updates (non-operator)", () => {
    it("allows member to update own name", async () => {
      mockSession(MEMBER_ID);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["member"], sections: [{ section: "forecasting", role: "member" }] });
      mockTransaction(makeUser());

      const res = await callPatch(MEMBER_ID, { name: "New Name" });
      expect(res.status).toBe(200);
      expect(mockPrismaTransaction).toHaveBeenCalled();
    });

    it("allows member to update own handle", async () => {
      mockSession(MEMBER_ID);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["member"], sections: [{ section: "forecasting", role: "member" }] });
      mockTransaction(makeUser());

      const res = await callPatch(MEMBER_ID, { handle: "newhandle" });
      expect(res.status).toBe(200);
    });

    it("rejects member setting globalRole on self", async () => {
      mockSession(MEMBER_ID);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["member"] });

      const res = await callPatch(MEMBER_ID, { globalRole: "owner" });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("globalRole");
      expect(mockPrismaTransaction).not.toHaveBeenCalled();
    });

    it("rejects member setting section role on self", async () => {
      mockSession(MEMBER_ID);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["member"] });

      const res = await callPatch(MEMBER_ID, { section: "forecasting", sectionRole: "lead" });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("section");
    });

    it("rejects member setting sections array on self", async () => {
      mockSession(MEMBER_ID);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["member"] });

      const res = await callPatch(MEMBER_ID, { sections: ["forecasting", "development"] });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("sections");
    });

    it("rejects member setting discordUserId on self", async () => {
      mockSession(MEMBER_ID);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["member"] });

      const res = await callPatch(MEMBER_ID, { discordUserId: "hacked-id" });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("discordUserId");
    });

    it("rejects combined legit + privileged fields from non-operator", async () => {
      mockSession(MEMBER_ID);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["member"] });

      const res = await callPatch(MEMBER_ID, { name: "Nice", globalRole: "owner" });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("globalRole");
    });

    it("rejects member editing another member", async () => {
      mockSession(MEMBER_ID);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["member"] });

      const res = await callPatch(OTHER_MEMBER_ID, { name: "Hacked" });
      expect(res.status).toBe(403);
    });

    it("does not call prisma when rejected", async () => {
      mockSession(MEMBER_ID);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["member"] });

      await callPatch(MEMBER_ID, { globalRole: "owner" });
      expect(mockPrismaTransaction).not.toHaveBeenCalled();
    });
  });

  describe("operator updates", () => {
    it("allows operator to update globalRole", async () => {
      mockSession(MEMBER_ID, ["owner"]);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["owner"] });
      const tx = mockTransaction(makeUser({ globalRoles: [{ role: { key: "owner" } }] }));
      tx.globalRole.findUnique.mockResolvedValue({ id: "role-1", key: "owner" });

      const res = await callPatch(MEMBER_ID, { globalRole: "owner" });
      expect(res.status).toBe(200);
      expect(tx.userGlobalRole.upsert).toHaveBeenCalled();
    });

    it("allows operator to update section membership", async () => {
      mockSession(MEMBER_ID, ["owner"]);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["owner"] });
      const tx = mockTransaction(makeUser());
      tx.section.findUnique.mockResolvedValue({ id: "sec-1", key: "forecasting" });

      const res = await callPatch(MEMBER_ID, { section: "forecasting", sectionRole: "lead" });
      expect(res.status).toBe(200);
      expect(tx.sectionMembership.upsert).toHaveBeenCalled();
    });

    it("allows operator to update discordUserId", async () => {
      mockSession(MEMBER_ID, ["owner"]);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["owner"] });
      const tx = mockTransaction(makeUser({ discordUserId: "new-discord-id" }));

      const res = await callPatch(MEMBER_ID, { discordUserId: "new-discord-id" });
      expect(res.status).toBe(200);
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ discordUserId: "new-discord-id" }),
        }),
      );
    });

    it("allows operator to edit another member", async () => {
      mockSession(MEMBER_ID, ["owner"]);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["owner"] });
      mockTransaction(makeUser({ id: OTHER_MEMBER_ID }));

      const res = await callPatch(OTHER_MEMBER_ID, { name: "Renamed" });
      expect(res.status).toBe(200);
    });

    it("allows operator to replace sections", async () => {
      mockSession(MEMBER_ID, ["owner"]);
      mockDiscordVerifiedUser(MEMBER_ID, { globalRoles: ["owner"] });
      const tx = mockTransaction(makeUser());
      tx.section.findMany.mockResolvedValue([
        { id: "sec-1", key: "forecasting" },
        { id: "sec-2", key: "development" },
      ]);

      const res = await callPatch(MEMBER_ID, { sections: ["forecasting", "development"] });
      expect(res.status).toBe(200);
      expect(tx.sectionMembership.deleteMany).toHaveBeenCalled();
    });
  });

  describe("unauthenticated requests", () => {
    it("rejects unauthenticated request", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const res = await callPatch(MEMBER_ID, { name: "Test" });
      expect(res.status).toBe(401);
    });
  });
});
