import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock("../src/auth", () => ({
  authOptions: {},
}));

const mockPrismaTransaction = vi.fn();
const mockPrismaUserFindUnique = vi.fn();
const mockPrismaOnboardingInviteFindUnique = vi.fn();

vi.mock("../src/db", () => ({
  get prisma() {
    return {
      get $transaction() {
        return mockPrismaTransaction;
      },
      user: {
        get findUnique() {
          return mockPrismaUserFindUnique;
        },
      },
      onboardingInvite: {
        get findUnique() {
          return mockPrismaOnboardingInviteFindUnique;
        },
      },
    };
  },
}));

interface TransactionMock {
  onboardingInvite: {
    updateMany: ReturnType<typeof vi.fn>;
  };
  section: { findMany: ReturnType<typeof vi.fn> };
  globalRole: { findUnique: ReturnType<typeof vi.fn> };
  user: { update: ReturnType<typeof vi.fn> };
  userGlobalRole: { upsert: ReturnType<typeof vi.fn> };
  sectionMembership: { upsert: ReturnType<typeof vi.fn> };
}

const USER_ID = "user-pending-1";

function mockSession(userId: string = USER_ID) {
  mockGetServerSession.mockResolvedValue({
    user: { id: userId },
  });
}

function mockDiscordVerifiedUser(
  options: {
    onboardingStatus?: "pending" | "verified";
    status?: "active" | "inactive" | "invited";
  } = {},
) {
  mockPrismaUserFindUnique.mockResolvedValue({
    discordServerVerified: true,
    onboardingStatus: options.onboardingStatus ?? "pending",
    status: options.status ?? "invited",
    globalRoles: [],
    sectionMemberships: [],
  });
}

function mockTransaction() {
  const tx: TransactionMock = {
    onboardingInvite: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    section: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    globalRole: {
      findUnique: vi.fn().mockResolvedValue({ id: "role-member", key: "member" }),
    },
    user: {
      update: vi.fn().mockResolvedValue({
        id: USER_ID,
        name: "Test User",
        handle: "testuser",
        discordUserId: "discord-123",
        onboardingStatus: "verified",
      }),
    },
    userGlobalRole: {
      upsert: vi.fn(),
    },
    sectionMembership: {
      upsert: vi.fn(),
    },
  };

  mockPrismaTransaction.mockImplementation(async (fn: (t: TransactionMock) => Promise<unknown>) => fn(tx));
  return tx;
}

async function callComplete(body: Record<string, unknown>) {
  const { POST } = await import("../app/api/onboarding/complete/route");
  const request = new Request("http://localhost/api/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/onboarding/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows Discord-verified pending user to onboard without token", async () => {
    mockSession();
    mockDiscordVerifiedUser({ onboardingStatus: "pending", status: "invited" });
    const tx = mockTransaction();
    tx.section.findMany.mockResolvedValue([{ id: "sec-1", key: "forecasting" }]);

    const res = await callComplete({
      name: "Test User",
      handle: "testuser",
      sections: ["forecasting"],
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.member.onboardingStatus).toBe("verified");
    expect(json.member.sections).toEqual([{ section: "forecasting", role: "member" }]);
    expect(json.invite).toBeUndefined();
    expect(tx.onboardingInvite.updateMany).not.toHaveBeenCalled();
    expect(tx.sectionMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: "member" }),
        update: { role: "member" },
      }),
    );
  });

  it("marks an open invite as used when token is provided", async () => {
    mockSession();
    mockDiscordVerifiedUser({ onboardingStatus: "pending", status: "invited" });
    const tx = mockTransaction();
    mockPrismaOnboardingInviteFindUnique.mockResolvedValue({
      id: "invite-1",
      token: "open-token",
      label: "New member",
      createdAt: new Date("2026-06-01T00:00:00Z"),
      createdBy: { globalRoles: [{ role: { key: "owner" } }] },
    });

    const res = await callComplete({
      token: "open-token",
      name: "Test User",
      handle: "testuser",
      sections: [],
    });

    expect(res.status).toBe(200);
    expect(tx.onboardingInvite.updateMany).toHaveBeenCalledWith({
      where: { token: "open-token", status: "open" },
      data: expect.objectContaining({
        status: "used",
        usedByUserId: USER_ID,
      }),
    });
    const json = await res.json();
    expect(json.invite?.status).toBe("used");
  });

  it("rejects invalid, used, or disabled invite tokens without mutating user", async () => {
    mockSession();
    mockDiscordVerifiedUser({ onboardingStatus: "pending", status: "invited" });
    const tx = mockTransaction();
    tx.onboardingInvite.updateMany.mockResolvedValue({ count: 0 });

    const res = await callComplete({
      token: "used-token",
      name: "Test User",
      handle: "testuser",
      sections: [],
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("Invite is not open");
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("allows only one concurrent consumer of the same invite", async () => {
    mockSession();
    mockDiscordVerifiedUser({ onboardingStatus: "pending", status: "invited" });

    const firstTx = mockTransaction();
    mockPrismaOnboardingInviteFindUnique.mockResolvedValue({
      id: "invite-1",
      token: "race-token",
      label: "Race",
      createdAt: new Date("2026-06-01T00:00:00Z"),
      createdBy: { globalRoles: [{ role: { key: "owner" } }] },
    });

    const first = await callComplete({
      token: "race-token",
      name: "First User",
      handle: "first",
      sections: [],
    });
    expect(first.status).toBe(200);

    const secondTx = mockTransaction();
    secondTx.onboardingInvite.updateMany.mockResolvedValue({ count: 0 });

    const second = await callComplete({
      token: "race-token",
      name: "Second User",
      handle: "second",
      sections: [],
    });
    expect(second.status).toBe(409);
    expect(secondTx.user.update).not.toHaveBeenCalled();
  });

  it("rejects already verified and active users", async () => {
    mockSession();
    mockDiscordVerifiedUser({ onboardingStatus: "verified", status: "active" });

    const res = await callComplete({
      name: "Test User",
      handle: "testuser",
      sections: [],
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("Onboarding already completed");
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
  });

  it("stores section memberships as member even when lead is requested in legacy shape", async () => {
    mockSession();
    mockDiscordVerifiedUser({ onboardingStatus: "pending", status: "invited" });
    const tx = mockTransaction();
    tx.section.findMany.mockResolvedValue([{ id: "sec-1", key: "forecasting" }]);

    const res = await callComplete({
      name: "Test User",
      handle: "testuser",
      sections: ["forecasting"],
    });

    expect(res.status).toBe(200);
    expect(tx.sectionMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { role: "member" },
        create: expect.objectContaining({ role: "member" }),
      }),
    );
  });

  it("rejects unknown section keys", async () => {
    mockSession();
    mockDiscordVerifiedUser({ onboardingStatus: "pending", status: "invited" });
    const tx = mockTransaction();
    tx.section.findMany.mockResolvedValue([]);

    const res = await callComplete({
      name: "Test User",
      handle: "testuser",
      sections: ["forecasting"],
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Unknown sections");
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await callComplete({
      name: "Test User",
      handle: "testuser",
      sections: [],
    });

    expect(res.status).toBe(401);
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
  });

  it("rejects users who are not Discord-verified", async () => {
    mockSession();
    mockPrismaUserFindUnique.mockResolvedValue({
      discordServerVerified: false,
      onboardingStatus: "pending",
      status: "invited",
      globalRoles: [],
      sectionMemberships: [],
    });

    const res = await callComplete({
      name: "Test User",
      handle: "testuser",
      sections: [],
    });

    expect(res.status).toBe(403);
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
  });
});
