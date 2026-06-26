import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseBody, parseQueryParams, handleApiError } from "../src/server/validation";
import {
  CreateTaskSchema,
  CreateMemberSchema,
  CreateAvailabilitySchema,
  CreateCommentSchema,
  TaskQuerySchema,
} from "../src/server/schemas";

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createUrl(params: Record<string, string>): URL {
  const url = new URL("http://localhost/api/test");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

describe("parseBody", () => {
  describe("valid payloads", () => {
    it("parses valid CreateTaskSchema body", async () => {
      const req = createRequest({ title: "Test task" });
      const result = await parseBody(CreateTaskSchema, req);
      expect(result).toHaveProperty("data");
      const data = (result as { data: z.infer<typeof CreateTaskSchema> }).data;
      expect(data.title).toBe("Test task");
      expect(data.section).toBe("development");
      expect(data.priority).toBe("normal");
    });

    it("parses valid CreateMemberSchema body", async () => {
      const req = createRequest({ name: "John", handle: "john" });
      const result = await parseBody(CreateMemberSchema, req);
      expect(result).toHaveProperty("data");
      const data = (result as { data: z.infer<typeof CreateMemberSchema> }).data;
      expect(data.name).toBe("John");
      expect(data.handle).toBe("john");
      expect(data.globalRole).toBe("member");
    });

    it("parses valid CreateAvailabilitySchema body", async () => {
      const req = createRequest({
        memberId: "u1",
        startsAt: "2026-06-25T10:00:00Z",
        endsAt: "2026-06-25T18:00:00Z",
      });
      const result = await parseBody(CreateAvailabilitySchema, req);
      expect(result).toHaveProperty("data");
      const data = (result as { data: z.infer<typeof CreateAvailabilitySchema> }).data;
      expect(data.memberId).toBe("u1");
      expect(data.status).toBe("available");
    });

    it("parses valid CreateCommentSchema body", async () => {
      const req = createRequest({ body: "Hello world" });
      const result = await parseBody(CreateCommentSchema, req);
      expect(result).toHaveProperty("data");
      const data = (result as { data: z.infer<typeof CreateCommentSchema> }).data;
      expect(data.body).toBe("Hello world");
    });
  });

  describe("invalid payloads", () => {
    it("returns error for malformed JSON", async () => {
      const req = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      const result = await parseBody(CreateTaskSchema, req);
      expect(result).toHaveProperty("error");
      const err = (result as { error: Response }).error;
      const json = await err.json() as { error: string };
      expect(json.error).toBe("Invalid JSON body");
    });

    it("returns error for empty body", async () => {
      const req = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await parseBody(CreateTaskSchema, req);
      expect(result).toHaveProperty("error");
    });

    it("returns field-level errors for missing required fields", async () => {
      const req = createRequest({});
      const result = await parseBody(CreateMemberSchema, req);
      expect(result).toHaveProperty("error");
      const err = (result as { error: Response }).error;
      const json = await err.json() as { error: string; errors: Array<{ field: string; message: string }> };
      expect(json.error).toBe("Validation failed");
      expect(json.errors).toBeDefined();
      expect(json.errors.length).toBeGreaterThan(0);
    });

    it("returns 400 for invalid enum value", async () => {
      const req = createRequest({ title: "Test", section: "invalid_section" });
      const result = await parseBody(CreateTaskSchema, req);
      expect(result).toHaveProperty("error");
      const err = (result as { error: Response }).error;
      expect(err.status).toBe(400);
      const json = await err.json() as { error: string };
      expect(json.error).toBe("Validation failed");
    });

    it("returns 400 for invalid date string", async () => {
      const req = createRequest({
        memberId: "u1",
        startsAt: "not-a-date",
        endsAt: "2026-06-25T18:00:00Z",
      });
      const result = await parseBody(CreateAvailabilitySchema, req);
      expect(result).toHaveProperty("error");
    });

    it("returns error when endsAt is before startsAt", async () => {
      const req = createRequest({
        memberId: "u1",
        startsAt: "2026-06-25T18:00:00Z",
        endsAt: "2026-06-25T10:00:00Z",
      });
      const result = await parseBody(CreateAvailabilitySchema, req);
      expect(result).toHaveProperty("error");
      const err = (result as { error: Response }).error;
      const json = await err.json() as { errors: Array<{ field: string; message: string }> };
      expect(json.errors).toBeDefined();
      expect(json.errors[0].field).toBe("endsAt");
    });
  });
});

describe("parseQueryParams", () => {
  it("parses valid query params", () => {
    const url = createUrl({ section: "forecasting", priority: "high" });
    const result = parseQueryParams(TaskQuerySchema, url);
    expect(result).toHaveProperty("data");
    const data = (result as { data: z.infer<typeof TaskQuerySchema> }).data;
    expect(data.section).toBe("forecasting");
    expect(data.priority).toBe("high");
  });

  it("returns error for invalid query params", () => {
    const url = createUrl({ section: "invalid" });
    const result = parseQueryParams(TaskQuerySchema, url);
    expect(result).toHaveProperty("error");
  });

  it("allows empty query params", () => {
    const url = new URL("http://localhost/api/test");
    const result = parseQueryParams(TaskQuerySchema, url);
    expect(result).toHaveProperty("data");
  });
});

describe("handleApiError", () => {
  it("returns 500 for generic errors", () => {
    const response = handleApiError(new Error("Something went wrong"));
    expect(response.status).toBe(500);
  });

  it("returns 500 for unknown non-Error values", () => {
    const response = handleApiError("string error");
    expect(response.status).toBe(500);
  });

  it("returns 500 for null", () => {
    const response = handleApiError(null);
    expect(response.status).toBe(500);
  });

  it("returns 409 for Prisma P2002 (unique constraint)", () => {
    const err = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["email"] },
    });
    const response = handleApiError(err);
    expect(response.status).toBe(409);
  });

  it("returns 404 for Prisma P2025 (record not found)", () => {
    const err = Object.assign(new Error("Not found"), {
      code: "P2025",
      meta: {},
    });
    const response = handleApiError(err);
    expect(response.status).toBe(404);
  });

  it("returns 400 for Prisma P2003 (foreign key violation)", () => {
    const err = Object.assign(new Error("FK violation"), {
      code: "P2003",
      meta: {},
    });
    const response = handleApiError(err);
    expect(response.status).toBe(400);
  });

  it("returns 400 for Prisma P2014 (required relation missing)", () => {
    const err = Object.assign(new Error("Relation missing"), {
      code: "P2014",
      meta: {},
    });
    const response = handleApiError(err);
    expect(response.status).toBe(400);
  });

  it("returns 500 for unknown Prisma error code", () => {
    const err = Object.assign(new Error("Unknown db error"), {
      code: "P9999",
      meta: {},
    });
    const response = handleApiError(err);
    expect(response.status).toBe(500);
  });

  it("returns 503 for Prisma initialization error", () => {
    class PrismaClientInitializationError extends Error {
      code = "P1000";
    }
    const err = new PrismaClientInitializationError("Connection failed");
    const response = handleApiError(err);
    expect(response.status).toBe(503);
  });

  it("returns 503 for Prisma Rust panic error", () => {
    class PrismaClientRustPanicError extends Error {
      code = "P5000";
    }
    const err = new PrismaClientRustPanicError("Engine panic");
    const response = handleApiError(err);
    expect(response.status).toBe(503);
  });
});
