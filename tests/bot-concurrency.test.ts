import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSpecialRequestUpdateMany = vi.fn();
const mockSpecialRequestFindUnique = vi.fn();
const mockTransaction = vi.fn();
const mockWeatherAlertEventFindUnique = vi.fn();
const mockWeatherAlertEventCreate = vi.fn();
const mockWeatherAlertEventUpdate = vi.fn();
const mockWeatherAlertSourceCreate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockDiscordRoleMappingFindMany = vi.fn();
const mockGuildMembersFetch = vi.fn();
const mockGuildsFetch = vi.fn();

vi.mock("../src/db", () => ({
  get prisma() {
    return {
      specialRequest: {
        updateMany: (...args: unknown[]) => mockSpecialRequestUpdateMany(...args),
        findUnique: (...args: unknown[]) => mockSpecialRequestFindUnique(...args),
      },
      $transaction: (arg: unknown) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return mockTransaction(arg);
      },
      weatherAlertEvent: {
        findUnique: (...args: unknown[]) => mockWeatherAlertEventFindUnique(...args),
        create: (...args: unknown[]) => mockWeatherAlertEventCreate(...args),
        update: (...args: unknown[]) => mockWeatherAlertEventUpdate(...args),
      },
      weatherAlertSource: {
        create: (...args: unknown[]) => mockWeatherAlertSourceCreate(...args),
      },
      user: {
        findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      },
      discordRoleMapping: {
        findMany: (...args: unknown[]) => mockDiscordRoleMappingFindMany(...args),
      },
    };
  },
}));

describe("respondToSpecialRequest", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSpecialRequestUpdateMany.mockReset();
    mockSpecialRequestFindUnique.mockReset();
  });

  it("updates only open requests for the target user", async () => {
    mockSpecialRequestUpdateMany.mockResolvedValue({ count: 1 });

    const { respondToSpecialRequest } = await import("../bot/plugins/core/special-request");
    const result = await respondToSpecialRequest("req-1", "user-1", "accepted");

    expect(result).toEqual({ ok: true, status: "accepted" });
    expect(mockSpecialRequestUpdateMany).toHaveBeenCalledWith({
      where: { id: "req-1", targetUserId: "user-1", status: "open" },
      data: expect.objectContaining({ status: "accepted", respondedAt: expect.any(Date) }),
    });
  });

  it("returns already_handled when the open guard misses but the request belongs to the user", async () => {
    mockSpecialRequestUpdateMany.mockResolvedValue({ count: 0 });
    mockSpecialRequestFindUnique.mockResolvedValue({ targetUserId: "user-1" });

    const { respondToSpecialRequest } = await import("../bot/plugins/core/special-request");
    const result = await respondToSpecialRequest("req-1", "user-1", "accepted");

    expect(result).toEqual({ ok: false, reason: "already_handled" });
  });

  it("returns not_found when the request is missing or belongs to another user", async () => {
    mockSpecialRequestUpdateMany.mockResolvedValue({ count: 0 });
    mockSpecialRequestFindUnique.mockResolvedValue(null);

    const { respondToSpecialRequest } = await import("../bot/plugins/core/special-request");
    const result = await respondToSpecialRequest("req-1", "user-1", "declined");

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("ingestWeatherAlertItem", () => {
  beforeEach(() => {
    vi.resetModules();
    mockTransaction.mockReset();
    mockWeatherAlertEventFindUnique.mockReset();
    mockWeatherAlertEventCreate.mockReset();
    mockWeatherAlertEventUpdate.mockReset();
    mockWeatherAlertSourceCreate.mockReset();
  });

  const source = { name: "nws-api", priority: 1 };
  const item = {
    eventType: "tornado_warning",
    sourceEventId: "event-123",
    title: "Tornado Warning",
    description: "Take shelter",
    severity: "extreme",
    affectedArea: "Sample County",
    rawPayload: { id: "event-123" },
  };

  it("creates a new event when none exists", async () => {
    mockWeatherAlertEventFindUnique.mockResolvedValue(null);
    mockWeatherAlertEventCreate.mockResolvedValue({
      id: "db-event-1",
      eventType: item.eventType,
      title: item.title,
      description: item.description,
      severity: item.severity,
      affectedArea: item.affectedArea,
    });

    const { ingestWeatherAlertItem } = await import("../bot/plugins/weather-alerts/ingest");
    const result = await ingestWeatherAlertItem(source, item);

    expect(result.action).toBe("created");
    if (result.action === "created") {
      expect(result.event.eventId).toBe("db-event-1");
      expect(result.event.eventType).toBe("tornado_warning");
    }
    expect(mockWeatherAlertEventCreate).toHaveBeenCalledOnce();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("updates an existing event without treating it as newly created", async () => {
    mockWeatherAlertEventFindUnique.mockResolvedValue({ id: "db-event-1" });
    mockWeatherAlertSourceCreate.mockResolvedValue({});
    mockWeatherAlertEventUpdate.mockResolvedValue({});

    const { ingestWeatherAlertItem } = await import("../bot/plugins/weather-alerts/ingest");
    const result = await ingestWeatherAlertItem(source, item);

    expect(result).toEqual({ action: "updated", eventId: "db-event-1" });
    expect(mockWeatherAlertSourceCreate).toHaveBeenCalled();
    expect(mockWeatherAlertEventUpdate).toHaveBeenCalled();
    expect(mockWeatherAlertEventCreate).not.toHaveBeenCalled();
  });

  it("recovers on a fresh connection when create races on the unique key", async () => {
    mockWeatherAlertEventFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "db-event-raced" });
    mockWeatherAlertEventCreate.mockRejectedValue({ code: "P2002" });
    mockWeatherAlertSourceCreate.mockResolvedValue({});
    mockWeatherAlertEventUpdate.mockResolvedValue({});

    const { ingestWeatherAlertItem } = await import("../bot/plugins/weather-alerts/ingest");
    const result = await ingestWeatherAlertItem(source, item);

    expect(result).toEqual({ action: "updated", eventId: "db-event-raced" });
    expect(mockWeatherAlertEventCreate).toHaveBeenCalledOnce();
    expect(mockWeatherAlertEventFindUnique).toHaveBeenCalledTimes(2);
    expect(mockWeatherAlertSourceCreate).toHaveBeenCalled();
    expect(mockWeatherAlertEventUpdate).toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("RoleManagerPlugin.syncUser", () => {
  const originalGuildId = process.env.DISCORD_GUILD_ID;

  beforeEach(() => {
    vi.resetModules();
    process.env.DISCORD_GUILD_ID = "guild-1";
    mockUserFindUnique.mockReset();
    mockDiscordRoleMappingFindMany.mockReset();
    mockGuildMembersFetch.mockReset();
    mockGuildsFetch.mockReset();
  });

  afterEach(() => {
    process.env.DISCORD_GUILD_ID = originalGuildId;
  });

  it("coalesces concurrent syncs for the same user", async () => {
    let resolveFetch: (() => void) | undefined;
    const fetchGate = new Promise<void>((resolve) => {
      resolveFetch = resolve;
    });

    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Tester",
      discordUserId: "discord-1",
      globalRoles: [{ role: { key: "member" } }],
      sectionMemberships: [],
    });
    mockDiscordRoleMappingFindMany.mockResolvedValue([
      { discordRoleId: "role-1", globalRoleKey: "member", sectionKey: null },
    ]);
    mockGuildsFetch.mockResolvedValue({
      members: {
        fetch: mockGuildMembersFetch.mockImplementation(async () => {
          await fetchGate;
          return {
            id: "discord-1",
            roles: {
              cache: new Map(),
              add: vi.fn().mockResolvedValue(undefined),
              remove: vi.fn().mockResolvedValue(undefined),
            },
          };
        }),
      },
    });

    const { RoleManagerPlugin } = await import("../bot/plugins/role-manager/index");
    const plugin = new RoleManagerPlugin();
    await plugin.onReady({
      guilds: { fetch: mockGuildsFetch },
    } as never);

    const first = plugin.syncUser("user-1");
    const second = plugin.syncUser("user-1");

    resolveFetch?.();
    await Promise.all([first, second]);

    expect(mockGuildMembersFetch).toHaveBeenCalledTimes(1);
    expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
  });
});
