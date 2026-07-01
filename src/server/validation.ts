import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "./api-response";
import { isLeantimeError } from "./leantime-errors";

type ZodSchema = z.ZodTypeAny;

export type ParsedBodySuccess<T> = { data: T; error?: never };
export type ParsedBodyError = { data?: never; error: NextResponse };
export type ParsedBody<T> = ParsedBodySuccess<T> | ParsedBodyError;

export async function parseBody<T extends ZodSchema>(
  schema: T,
  request: Request
): Promise<ParsedBody<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: apiError("Invalid JSON body", 400) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "(root)",
      message: issue.message,
    }));
    return {
      error: apiError("Validation failed", 400, fieldErrors),
    };
  }

  return { data: result.data };
}

export function parseQueryParams<T extends ZodSchema>(
  schema: T,
  url: URL
): ParsedBody<z.infer<T>> {
  const params: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  const result = schema.safeParse(params);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "(root)",
      message: issue.message,
    }));
    return {
      error: apiError("Invalid query parameters", 400, fieldErrors),
    };
  }

  return { data: result.data };
}

interface PrismaLikeError {
  code?: string;
  meta?: { target?: string[] };
  constructor?: { name?: string };
}

function isPrismaKnownRequestError(err: unknown): err is PrismaLikeError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as PrismaLikeError).code === "string" &&
    /^P\d{4}$/.test((err as PrismaLikeError).code!) &&
    "meta" in err
  );
}

function isPrismaInitError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    err.constructor?.name === "PrismaClientInitializationError"
  );
}

function isPrismaRustPanicError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    err.constructor?.name === "PrismaClientRustPanicError"
  );
}

export function handleApiError(error: unknown): NextResponse {
  if (isLeantimeError(error)) {
    console.error("[API] Leantime error:", error.toLogFields());
    return apiError(error.message, error.httpStatus());
  }

  if (isPrismaKnownRequestError(error)) {
    switch (error.code) {
      case "P2002": {
        const target = error.meta?.target || [];
        const fields = target.length > 0 ? target.join(", ") : "record";
        return apiError(`A record with that ${fields} already exists`, 409);
      }
      case "P2025":
        return apiError("Record not found", 404);
      case "P2003":
        return apiError("Related record not found", 400);
      case "P2014":
        return apiError("A required relation is missing", 400);
      default:
        return apiError("Database error", 500);
    }
  }

  if (isPrismaInitError(error)) {
    return apiError("Database connection failed", 503);
  }

  if (isPrismaRustPanicError(error)) {
    return apiError("Database engine error", 503);
  }

  console.error("[API] Unhandled error:", error);
  return apiError("Internal server error", 500);
}
