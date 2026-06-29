import type { Priority, SectionKey, Task, TaskComment, TaskStatus } from "../types";
import { prisma } from "../db";
import {
  createCorrelationId,
  isLeantimeError,
  LeantimeNotConfiguredError,
  LeantimeResponseError,
  LeantimeTimeoutError,
  LeantimeTransportError,
  rpcErrorFromPayload,
  transportErrorFromStatus,
  type LeantimeErrorKind,
} from "./leantime-errors";

type LeantimeTaskQuery = {
  section?: SectionKey;
  priority?: Priority;
  assigneeId?: string;
  status?: TaskStatus;
  label?: string;
  limit?: number;
};

type LeantimeTaskInput = {
  title: string;
  description?: string;
  section: SectionKey;
  priority: Priority;
  dueAt?: string;
  assigneeId?: string;
};

type JsonRpcResponse<T> = {
  jsonrpc?: string;
  id?: string | number;
  result?: T;
  error?: { message?: string; code?: number } | string;
};

type LeantimeTicket = {
  id?: number | string;
  headline?: string;
  title?: string;
  description?: string | null;
  status?: string | number | null;
  priority?: string | number | null;
  dateToFinish?: string | null;
  editorId?: string | number | null;
  userId?: string | number | null;
  projectId?: string | number | null;
};

export type LeantimeTasksResult = {
  configured: boolean;
  tasks: Task[];
  error?: string;
  errorKind?: LeantimeErrorKind;
  degraded?: boolean;
  correlationId?: string;
};

const defaultLeantimeUrl = "https://tasks.weathertrackus.com";
const RETRY_BACKOFF_MS = [200, 500];

function getLeantimeUrl() {
  return (process.env.LEANTIME_URL || defaultLeantimeUrl).replace(/\/$/, "");
}

function getApiKey() {
  return process.env.LEANTIME_API_KEY?.trim() || "";
}

function getRpcTimeoutMs() {
  const parsed = Number.parseInt(process.env.LEANTIME_RPC_TIMEOUT_MS ?? "10000", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
}

function getRpcMaxRetries() {
  const parsed = Number.parseInt(process.env.LEANTIME_RPC_MAX_RETRIES ?? "2", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2;
}

const defaultProjectId = process.env.LEANTIME_DEFAULT_PROJECT_ID || process.env.LEANTIME_CONTENT_PROJECT_ID || process.env.LEANTIME_PROJECT_ID || "1";
// Reads and idempotent updates may retry; creates/comments must not duplicate remote records.
const RETRYABLE_RPC_METHODS = new Set([
  "leantime.rpc.tickets.getAll",
  "leantime.rpc.tickets.getTicket",
  "leantime.rpc.tickets.updateTicket",
]);
// The 4 WTUS projects in Leantime (clientId=1). Excludes id=6 "My Project" (default test project).
const WTUS_PROJECT_IDS = new Set(["2", "3", "4", "5"]);

function configured() {
  return Boolean(getApiKey());
}

function isRetryableRpcMethod(method: string) {
  return RETRYABLE_RPC_METHODS.has(method);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toDegradedResult(error: unknown): LeantimeTasksResult {
  if (isLeantimeError(error)) {
    return {
      configured: error.kind !== "not_configured",
      tasks: [],
      error: error.message,
      errorKind: error.kind,
      degraded: true,
      correlationId: error.correlationId,
    };
  }

  return {
    configured: true,
    tasks: [],
    error: error instanceof Error ? error.message : "Leantime tasks unavailable",
    errorKind: "transport",
    degraded: true,
  };
}

async function rpcAttempt<T>(
  method: string,
  params: Record<string, unknown>,
  requestId: string,
  correlationId: string,
  timeoutMs: number,
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new LeantimeNotConfiguredError(method, correlationId);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${getLeantimeUrl()}/api/jsonrpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method,
        params,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new LeantimeTimeoutError(method, correlationId, timeoutMs);
    }
    throw new LeantimeTransportError(method, correlationId, `Leantime network error for ${method}`, { retryable: true });
  }

  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new LeantimeTimeoutError(method, correlationId, timeoutMs);
    }
    throw new LeantimeTransportError(method, correlationId, `Leantime network error for ${method}`, { retryable: true });
  }
  clearTimeout(timeout);
  let payload: JsonRpcResponse<T> | null = null;
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as JsonRpcResponse<T>;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload.error === "string"
        ? payload.error
        : payload?.error && typeof payload.error === "object"
          ? payload.error.message
          : rawBody || undefined;
    throw transportErrorFromStatus(method, correlationId, response.status, detail);
  }

  if (!payload || payload.jsonrpc !== "2.0") {
    throw new LeantimeResponseError(method, correlationId, `Leantime returned an invalid JSON-RPC envelope for ${method}`);
  }

  if (payload.error) {
    throw rpcErrorFromPayload(method, correlationId, payload.error);
  }

  if (!("result" in payload)) {
    throw new LeantimeResponseError(method, correlationId, `Leantime response missing result for ${method}`);
  }

  return payload.result as T;
}

async function rpc<T>(method: string, params: Record<string, unknown> = {}) {
  const correlationId = createCorrelationId();
  const requestId = correlationId;
  const timeoutMs = getRpcTimeoutMs();
  const maxRetries = getRpcMaxRetries();
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BACKOFF_MS[attempt - 1] ?? RETRY_BACKOFF_MS.at(-1)!);
    }

    try {
      return await rpcAttempt<T>(method, params, requestId, correlationId, timeoutMs);
    } catch (error) {
      lastError = error;
      if (!isLeantimeError(error) || !error.retryable || !isRetryableRpcMethod(method) || attempt >= maxRetries) {
        throw error;
      }
    }
  }

  throw lastError;
}

function normalizeTicketList(result: unknown): LeantimeTicket[] {
  if (Array.isArray(result)) return result as LeantimeTicket[];
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    if (Array.isArray(record.tickets)) return record.tickets as LeantimeTicket[];
    if (Array.isArray(record.rows)) return record.rows as LeantimeTicket[];
    if (Array.isArray(record.data)) return record.data as LeantimeTicket[];
    return Object.values(record).filter((item) => item && typeof item === "object") as LeantimeTicket[];
  }
  return [];
}

function priorityFromLeantime(value: LeantimeTicket["priority"]): Priority {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("urgent") || normalized === "4") return "urgent";
  if (normalized.includes("high") || normalized === "3") return "high";
  if (normalized.includes("low") || normalized === "1") return "low";
  return "normal";
}

function statusFromLeantime(value: LeantimeTicket["status"]): TaskStatus {
  // WTUS Leantime project status IDs (all 4 projects share the same config):
  //   0  = Done      (statusType: DONE)
  //  -1  = Archived  (statusType: DONE)
  //   3  = New       (statusType: NEW)
  //   1  = Blocked   (statusType: INPROGRESS)
  //   4  = In Progress (statusType: INPROGRESS)
  //   2  = Waiting for Approval (statusType: INPROGRESS)
  const num = Number(value);
  if (num === 0 || num === -1) return "done";
  if (num === 4) return "in_progress";
  if (num === 1) return "blocked";
  if (num === 2) return "review";
  if (num === 3) return "todo";
  // Fallback: string-based matching for any future custom statuses
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("done") || normalized.includes("complete") || normalized.includes("archiv")) return "done";
  if (normalized.includes("progress")) return "in_progress";
  if (normalized.includes("block")) return "blocked";
  if (normalized.includes("review") || normalized.includes("approval")) return "review";
  return "todo";
}

function leantimeStatus(status: TaskStatus): number {
  // Map dashboard status back to WTUS Leantime numeric status IDs
  if (status === "done") return 0;
  if (status === "in_progress") return 4;
  if (status === "blocked") return 1;
  if (status === "review") return 2;
  return 3; // todo / new
}

function toTask(ticket: LeantimeTicket): Task {
  const id = String(ticket.id ?? "");
  return {
    id,
    title: ticket.headline ?? ticket.title ?? `Leantime task ${id}`,
    section: "development",
    status: statusFromLeantime(ticket.status),
    priority: priorityFromLeantime(ticket.priority),
    assigneeIds: ticket.editorId || ticket.userId ? [String(ticket.editorId ?? ticket.userId)] : [],
    ownerId: "",
    due: ticket.dateToFinish ? String(ticket.dateToFinish).slice(0, 10) : "",
    notes: ticket.description ?? "",
    comments: [],
    isRecurring: false,
  };
}

async function mergeDashboardMetadata(tasks: Task[]) {
  const ids = tasks.map((task) => task.id).filter(Boolean);
  if (!ids.length) return tasks;
  const metadata = await prisma.task.findMany({
    where: { id: { in: ids } },
    include: { section: true, comments: { orderBy: { createdAt: "desc" }, include: { user: true } } },
  });
  const byId = new Map(metadata.map((task) => [task.id, task]));
  return tasks.map((task) => {
    const local = byId.get(task.id);
    if (!local) return task;
    return {
      ...task,
      section: local.section?.key ?? task.section,
      assigneeIds: local.assigneeIds.length ? local.assigneeIds : local.assigneeId ? [local.assigneeId] : task.assigneeIds,
      ownerId: local.createdById ?? task.ownerId,
      comments: local.comments.map<TaskComment>((comment) => ({
        id: comment.id,
        taskId: comment.taskId,
        userId: comment.userId ?? undefined,
        authorName: comment.user?.name ?? comment.user?.handle ?? comment.user?.discordHandle ?? "Team",
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      })),
    };
  });
}

export async function fetchLeantimeTasks(query: LeantimeTaskQuery = {}): Promise<LeantimeTasksResult> {
  if (!configured()) {
    return {
      configured: false,
      tasks: [],
      error: "LEANTIME_API_KEY is not configured",
      errorKind: "not_configured",
      degraded: true,
    };
  }

  try {
    const result = await rpc<unknown>("leantime.rpc.tickets.getAll", {
      limit: query.limit ?? 50,
    });
    let tasks = await mergeDashboardMetadata(
      normalizeTicketList(result)
        .filter((ticket) => WTUS_PROJECT_IDS.has(String(ticket.projectId ?? "")))
        .map(toTask)
        .filter((task) => task.id && task.status !== "done")
    );
    if (query.status) tasks = tasks.filter((task) => task.status === query.status);
    if (query.priority) tasks = tasks.filter((task) => task.priority === query.priority);
    if (query.label) tasks = tasks.filter((task) => task.title.toLowerCase().includes(query.label!.toLowerCase()));
    if (query.assigneeId) tasks = tasks.filter((task) => task.assigneeIds.includes(query.assigneeId!));
    return { configured: true, tasks };
  } catch (error) {
    return toDegradedResult(error);
  }
}

export async function createLeantimeTask(input: LeantimeTaskInput) {
  const result = await rpc<unknown>("leantime.rpc.tickets.quickAddTicket", {
    projectId: defaultProjectId,
    headline: input.title,
    description: input.description,
    priority: input.priority,
    dateToFinish: input.dueAt,
  });
  const ticket = Array.isArray(result) ? result[0] : result;
  const task = toTask(ticket as LeantimeTicket);
  const section = await prisma.section.findUnique({ where: { key: input.section }, select: { id: true } });
  await prisma.task.upsert({
    where: { id: task.id },
    update: {
      title: task.title,
      description: input.description,
      priority: input.priority,
      sectionId: section?.id,
      assigneeId: input.assigneeId || null,
      assigneeIds: input.assigneeId ? [input.assigneeId] : [],
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
    create: {
      id: task.id,
      title: task.title,
      description: input.description,
      priority: input.priority,
      sectionId: section?.id,
      assigneeId: input.assigneeId || null,
      assigneeIds: input.assigneeId ? [input.assigneeId] : [],
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
  });
  return (await mergeDashboardMetadata([task]))[0];
}

export async function updateLeantimeTask(taskId: string, updates: Partial<LeantimeTaskInput> & { status?: TaskStatus }) {
  await rpc<unknown>("leantime.rpc.tickets.updateTicket", {
    id: taskId,
    values: {
      ...(updates.title ? { headline: updates.title } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.priority ? { priority: updates.priority } : {}),
      ...(updates.dueAt !== undefined ? { dateToFinish: updates.dueAt || null } : {}),
      ...(updates.status ? { status: leantimeStatus(updates.status) } : {}),
    },
  });
  const ticket = await rpc<LeantimeTicket>("leantime.rpc.tickets.getTicket", { id: taskId });
  const section = updates.section ? await prisma.section.findUnique({ where: { key: updates.section }, select: { id: true } }) : null;
  await prisma.task.upsert({
    where: { id: taskId },
    update: {
      ...(updates.title ? { title: updates.title } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.priority ? { priority: updates.priority } : {}),
      ...(section ? { sectionId: section.id } : {}),
      ...(updates.assigneeId !== undefined
        ? { assigneeId: updates.assigneeId || null, assigneeIds: updates.assigneeId ? [updates.assigneeId] : [] }
        : {}),
      ...(updates.dueAt !== undefined ? { dueAt: updates.dueAt ? new Date(updates.dueAt) : null } : {}),
      ...(updates.status ? { status: updates.status } : {}),
    },
    create: {
      id: taskId,
      title: updates.title ?? toTask(ticket).title,
      description: updates.description,
      priority: updates.priority ?? priorityFromLeantime(ticket.priority),
      sectionId: section?.id,
      assigneeId: updates.assigneeId || null,
      assigneeIds: updates.assigneeId ? [updates.assigneeId] : [],
      dueAt: updates.dueAt ? new Date(updates.dueAt) : null,
      status: updates.status ?? statusFromLeantime(ticket.status),
    },
  });
  return (await mergeDashboardMetadata([toTask(ticket)]))[0];
}

export async function deleteLeantimeTask(taskId: string) {
  await rpc<unknown>("leantime.rpc.tickets.updateTicket", {
    id: taskId,
    values: { status: "done" },
  });
}

export async function addLeantimeTaskComment(taskId: string, body: string) {
  await rpc<unknown>("leantime.rpc.comments.addComment", {
    module: "tickets",
    moduleId: taskId,
    text: body,
  });
  await prisma.task.upsert({
    where: { id: taskId },
    update: {},
    create: { id: taskId, title: `Leantime task ${taskId}` },
  });
  const comment = await prisma.taskComment.create({
    data: { taskId, body },
    include: { user: true },
  });
  return {
    id: comment.id,
    taskId,
    userId: comment.userId ?? undefined,
    authorName: comment.user?.name ?? comment.user?.handle ?? comment.user?.discordHandle ?? "Team",
    body,
    createdAt: comment.createdAt.toISOString(),
  } satisfies TaskComment;
}

export {
  isLeantimeError,
  LeantimeError,
  LeantimeNotConfiguredError,
  LeantimeTimeoutError,
  LeantimeTransportError,
  LeantimeRpcError,
  LeantimeResponseError,
} from "./leantime-errors";
