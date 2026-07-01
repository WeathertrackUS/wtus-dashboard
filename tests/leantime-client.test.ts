import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("../src/db", () => ({
  prisma: {
    task: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
    },
    section: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    taskComment: {
      create: vi.fn(),
    },
  },
}));

function jsonRpcResult(result: unknown, id = "lt-test") {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function hungFetch() {
  return vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    }),
  );
}

function slowBodyFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    const response = new Response(null, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    vi.spyOn(response, "text").mockImplementation(
      () =>
        new Promise<string>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException("The operation was aborted.", "AbortError"));
            return;
          }
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );

    return Promise.resolve(response);
  });
}

async function loadLeantime() {
  return import("../src/server/leantime");
}

describe("Leantime RPC client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("LEANTIME_API_KEY", "test-api-key");
    vi.stubEnv("LEANTIME_RPC_TIMEOUT_MS", "100");
    vi.stubEnv("LEANTIME_RPC_MAX_RETRIES", "2");
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("times out hung requests with bounded retries", async () => {
    fetchMock.mockImplementation(hungFetch());

    const { fetchLeantimeTasks, LeantimeTimeoutError, createLeantimeTask } = await loadLeantime();
    const result = await fetchLeantimeTasks();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      configured: true,
      tasks: [],
      degraded: true,
      errorKind: "timeout",
    });
    expect(result.error).toContain("timed out");
    expect(result.correlationId).toBeTruthy();

    fetchMock.mockClear();
    fetchMock.mockImplementation(hungFetch());

    await expect(
      createLeantimeTask({
        title: "Test",
        section: "development",
        priority: "normal",
      }),
    ).rejects.toBeInstanceOf(LeantimeTimeoutError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("times out when headers arrive quickly but the body never completes", async () => {
    fetchMock.mockImplementation(slowBodyFetch());

    const { fetchLeantimeTasks } = await loadLeantime();
    const result = await fetchLeantimeTasks();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      configured: true,
      tasks: [],
      degraded: true,
      errorKind: "timeout",
    });
  });

  it("retries HTTP 500 and succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("server error", { status: 500 }))
      .mockResolvedValueOnce(jsonRpcResult([]));

    const { fetchLeantimeTasks } = await loadLeantime();
    const result = await fetchLeantimeTasks();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ configured: true, tasks: [] });
  });

  it("does not retry non-idempotent task creation on HTTP 500", async () => {
    fetchMock.mockResolvedValueOnce(new Response("server error", { status: 500 }));

    const { createLeantimeTask, LeantimeTransportError } = await loadLeantime();

    await expect(
      createLeantimeTask({
        title: "Test",
        section: "development",
        priority: "normal",
      }),
    ).rejects.toBeInstanceOf(LeantimeTransportError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-idempotent comment creation on HTTP 500", async () => {
    fetchMock.mockResolvedValueOnce(new Response("server error", { status: 500 }));

    const { addLeantimeTaskComment, LeantimeTransportError } = await loadLeantime();

    await expect(addLeantimeTaskComment("task-1", "hello")).rejects.toBeInstanceOf(LeantimeTransportError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries idempotent ticket updates on HTTP 500", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("server error", { status: 500 }))
      .mockResolvedValueOnce(jsonRpcResult(null));

    const { deleteLeantimeTask } = await loadLeantime();
    await deleteLeantimeTask("task-1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry HTTP 401 responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response("unauthorized", { status: 401 }));

    const { createLeantimeTask, LeantimeTransportError } = await loadLeantime();

    await expect(
      createLeantimeTask({
        title: "Test",
        section: "development",
        priority: "normal",
      }),
    ).rejects.toBeInstanceOf(LeantimeTransportError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid JSON without retry", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not-json", { status: 200 }));

    const { createLeantimeTask, LeantimeResponseError } = await loadLeantime();

    await expect(
      createLeantimeTask({
        title: "Test",
        section: "development",
        priority: "normal",
      }),
    ).rejects.toBeInstanceOf(LeantimeResponseError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects RPC validation errors without retry", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "lt-test",
          error: { code: -32602, message: "Invalid params" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { createLeantimeTask, LeantimeRpcError } = await loadLeantime();

    await expect(
      createLeantimeTask({
        title: "Test",
        section: "development",
        priority: "normal",
      }),
    ).rejects.toMatchObject({
      name: "LeantimeRpcError",
      message: "Invalid params",
      retryable: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("includes the RPC method in error messages", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "lt-test",
          error: { code: -32601, message: "Method not found" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { fetchLeantimeTasks } = await loadLeantime();
    const result = await fetchLeantimeTasks();

    expect(result.errorKind).toBe("rpc");
    expect(result.error).toContain("Method not found");
    expect(result.degraded).toBe(true);
  });

  it("returns a degraded result when Leantime is unavailable", async () => {
    fetchMock.mockImplementation(hungFetch());

    const { fetchLeantimeTasks } = await loadLeantime();
    const result = await fetchLeantimeTasks();

    expect(result).toEqual({
      configured: true,
      tasks: [],
      degraded: true,
      errorKind: "timeout",
      error: expect.stringContaining("timed out"),
      correlationId: expect.any(String),
    });
  });
});

describe("Leantime error helpers", () => {
  it("exposes safe log fields without secrets", async () => {
    const { LeantimeRpcError } = await import("../src/server/leantime-errors");
    const error = new LeantimeRpcError("leantime.rpc.tickets.getAll", "lt-abc", "upstream failed", {
      retryable: false,
      code: -32602,
    });

    expect(error.toLogFields()).toEqual({
      kind: "rpc",
      method: "leantime.rpc.tickets.getAll",
      correlationId: "lt-abc",
      message: "upstream failed",
    });
    expect(error.httpStatus()).toBe(502);
  });

  it("maps not-configured write failures to 503", async () => {
    const { LeantimeNotConfiguredError } = await import("../src/server/leantime-errors");
    const error = new LeantimeNotConfiguredError("leantime.rpc.tickets.getAll", "lt-abc");

    expect(error.httpStatus()).toBe(503);
  });
});
