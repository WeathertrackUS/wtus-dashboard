import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock("../src/auth", () => ({
  authOptions: {},
}));

const mockPrismaTransaction = vi.fn();
const mockPrismaLiveEventFindUnique = vi.fn();
const mockPrismaLiveEventUpdate = vi.fn();
const mockPrismaLiveEventUpdateCreate = vi.fn();
const mockPrismaLiveEventFindUniqueOrThrow = vi.fn();
const mockPrismaUserFindUnique = vi.fn();

vi.mock("../src/db", () => ({
  get prisma() {
    return {
      get $transaction() {
        return mockPrismaTransaction;
      },
      liveEvent: {
        get findUnique() {
          return mockPrismaLiveEventFindUnique;
        },
      },
      user: {
        get findUnique() {
          return mockPrismaUserFindUnique;
        },
      },
    };
  },
}));

const EVENT_ID = "event-1";
const OPERATOR_ID = "user-operator-1";

function mockSession(userId: string, globalRoles: string[] = ["member"]) {
  mockGetServerSession.mockResolvedValue({
    user: { id: userId, globalRoles },
  });
}

function mockDiscordVerifiedUser(
  userId: string,
  options: {
    globalRoles?: string[];
    onboardingStatus?: "pending" | "verified";
    status?: "active" | "inactive" | "invited";
  } = {},
) {
  mockPrismaUserFindUnique.mockResolvedValue({
    discordServerVerified: true,
    onboardingStatus: options.onboardingStatus ?? "verified",
    status: options.status ?? "active",
    globalRoles: (options.globalRoles ?? ["member"]).map((key) => ({ role: { key } })),
    sectionMemberships: [],
  });
}

function makeLiveEventRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    name: "Severe Weather Event",
    description: "Initial description",
    status: "active",
    startsAt: new Date("2026-06-29T12:00:00.000Z"),
    endsAt: null,
    briefing: "Stay tuned",
    roles: [],
    assignments: [],
    updates: [],
    ...overrides,
  };
}

function mockTransaction(finalEvent?: ReturnType<typeof makeLiveEventRecord>) {
  const tx = {
    liveEvent: {
      update: mockPrismaLiveEventUpdate,
      findUniqueOrThrow: mockPrismaLiveEventFindUniqueOrThrow,
    },
    liveEventUpdate: {
      create: mockPrismaLiveEventUpdateCreate,
    },
  };

  mockPrismaTransaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

  if (finalEvent) {
    mockPrismaLiveEventFindUniqueOrThrow.mockResolvedValue(finalEvent);
  }

  return tx;
}

async function callPatch(eventId: string, body: Record<string, unknown>) {
  const { PATCH } = await import("../app/api/live-events/[eventId]/route");
  const request = new Request(`http://localhost/api/live-events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ eventId }) });
}

describe("PATCH /api/live-events/:eventId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaLiveEventUpdate.mockResolvedValue({});
    mockPrismaLiveEventUpdateCreate.mockResolvedValue({ id: "update-1" });
  });

  it("allows operator to patch metadata", async () => {
    mockSession(OPERATOR_ID, ["owner"]);
    mockDiscordVerifiedUser(OPERATOR_ID, { globalRoles: ["owner"] });
    mockPrismaLiveEventFindUnique.mockResolvedValue(makeLiveEventRecord());
    const updated = makeLiveEventRecord({
      name: "Updated Event",
      description: "New description",
      briefing: "Updated briefing",
    });
    mockTransaction(updated);

    const res = await callPatch(EVENT_ID, {
      name: "Updated Event",
      description: "New description",
      briefing: "Updated briefing",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.event.name).toBe("Updated Event");
    expect(json.event.description).toBe("New description");
    expect(json.event.briefing).toBe("Updated briefing");
    expect(mockPrismaLiveEventUpdate).toHaveBeenCalledWith({
      where: { id: EVENT_ID },
      data: {
        name: "Updated Event",
        description: "New description",
        briefing: "Updated briefing",
      },
    });
    expect(mockPrismaLiveEventUpdateCreate).not.toHaveBeenCalled();
  });

  it("appends a team update post with author", async () => {
    mockSession(OPERATOR_ID, ["operations_lead"]);
    mockDiscordVerifiedUser(OPERATOR_ID, { globalRoles: ["operations_lead"] });
    mockPrismaLiveEventFindUnique.mockResolvedValue(makeLiveEventRecord());
    const updated = makeLiveEventRecord({
      updates: [
        {
          id: "update-1",
          body: "Rotation complete on the western flank",
          createdAt: new Date("2026-06-29T13:00:00.000Z"),
          createdBy: { name: "Ops Lead", handle: "opslead", discordHandle: null },
        },
      ],
    });
    mockTransaction(updated);

    const res = await callPatch(EVENT_ID, { update: "Rotation complete on the western flank" });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.event.updates).toHaveLength(1);
    expect(json.event.updates[0].body).toBe("Rotation complete on the western flank");
    expect(json.event.updates[0].createdBy).toBe("Ops Lead");
    expect(mockPrismaLiveEventUpdateCreate).toHaveBeenCalledWith({
      data: {
        liveEventId: EVENT_ID,
        body: "Rotation complete on the western flank",
        createdById: OPERATOR_ID,
      },
    });
    expect(mockPrismaLiveEventUpdate).not.toHaveBeenCalled();
  });

  it("rejects non-operator", async () => {
    mockSession("user-member-1");
    mockDiscordVerifiedUser("user-member-1", { globalRoles: ["member"] });

    const res = await callPatch(EVENT_ID, { name: "Blocked" });

    expect(res.status).toBe(403);
    expect(mockPrismaLiveEventFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown event", async () => {
    mockSession(OPERATOR_ID, ["owner"]);
    mockDiscordVerifiedUser(OPERATOR_ID, { globalRoles: ["owner"] });
    mockPrismaLiveEventFindUnique.mockResolvedValue(null);

    const res = await callPatch("missing-event", { name: "Nope" });

    expect(res.status).toBe(404);
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
  });

  it("returns 400 for empty body", async () => {
    mockSession(OPERATOR_ID, ["owner"]);
    mockDiscordVerifiedUser(OPERATOR_ID, { globalRoles: ["owner"] });

    const res = await callPatch(EVENT_ID, {});

    expect(res.status).toBe(400);
    expect(mockPrismaLiveEventFindUnique).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await callPatch(EVENT_ID, { name: "Test" });

    expect(res.status).toBe(401);
  });
});
