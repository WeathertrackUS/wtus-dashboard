export type LeantimeErrorKind = "not_configured" | "timeout" | "transport" | "rpc" | "response";

export abstract class LeantimeError extends Error {
  abstract readonly kind: LeantimeErrorKind;
  abstract readonly retryable: boolean;
  readonly method: string;
  readonly correlationId: string;

  constructor(method: string, correlationId: string, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.method = method;
    this.correlationId = correlationId;
  }

  toLogFields() {
    return {
      kind: this.kind,
      method: this.method,
      correlationId: this.correlationId,
      message: this.message,
    };
  }

  httpStatus(): number {
    if (this.kind === "timeout") return 503;
    return 502;
  }
}

export class LeantimeNotConfiguredError extends LeantimeError {
  readonly kind = "not_configured" as const;
  readonly retryable = false;

  constructor(method: string, correlationId: string) {
    super(method, correlationId, "LEANTIME_API_KEY is not configured");
  }
}

export class LeantimeTimeoutError extends LeantimeError {
  readonly kind = "timeout" as const;
  readonly retryable = true;

  constructor(method: string, correlationId: string, timeoutMs: number) {
    super(method, correlationId, `Leantime RPC timed out after ${timeoutMs}ms: ${method}`);
  }
}

export class LeantimeTransportError extends LeantimeError {
  readonly kind = "transport" as const;
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor(method: string, correlationId: string, message: string, options: { retryable: boolean; statusCode?: number }) {
    super(method, correlationId, message);
    this.retryable = options.retryable;
    this.statusCode = options.statusCode;
  }
}

export class LeantimeRpcError extends LeantimeError {
  readonly kind = "rpc" as const;
  readonly retryable: boolean;
  readonly code?: number;

  constructor(method: string, correlationId: string, message: string, options: { retryable: boolean; code?: number }) {
    super(method, correlationId, message);
    this.retryable = options.retryable;
    this.code = options.code;
  }
}

export class LeantimeResponseError extends LeantimeError {
  readonly kind = "response" as const;
  readonly retryable = false;

  constructor(method: string, correlationId: string, message: string) {
    super(method, correlationId, message);
  }
}

export function isLeantimeError(error: unknown): error is LeantimeError {
  return error instanceof LeantimeError;
}

export function createCorrelationId() {
  return `lt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isRetryableHttpStatus(status: number) {
  return status === 429 || status >= 500;
}

function isRetryableRpcCode(code: number | undefined) {
  return code === -32603;
}

export function transportErrorFromStatus(
  method: string,
  correlationId: string,
  status: number,
  detail?: string,
): LeantimeTransportError {
  const message = detail
    ? `Leantime HTTP ${status} for ${method}: ${detail}`
    : `Leantime HTTP ${status} for ${method}`;
  return new LeantimeTransportError(method, correlationId, message, {
    retryable: isRetryableHttpStatus(status),
    statusCode: status,
  });
}

export function rpcErrorFromPayload(
  method: string,
  correlationId: string,
  error: { message?: string; code?: number } | string,
): LeantimeRpcError {
  const message = typeof error === "string" ? error : error.message || `Leantime RPC failed: ${method}`;
  const code = typeof error === "string" ? undefined : error.code;
  return new LeantimeRpcError(method, correlationId, message, {
    retryable: isRetryableRpcCode(code),
    code,
  });
}
