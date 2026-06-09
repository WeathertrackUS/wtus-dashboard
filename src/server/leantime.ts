import type { Priority, SectionKey, Task, TaskComment, TaskStatus } from "../types";
import { prisma } from "../db";

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

const defaultLeantimeUrl = "https://tasks.weathertrackus.com";
const leantimeUrl = (process.env.LEANTIME_URL || defaultLeantimeUrl).replace(/\/$/, "");
const apiKey = process.env.LEANTIME_API_KEY;
const defaultProjectId = process.env.LEANTIME_DEFAULT_PROJECT_ID || process.env.LEANTIME_CONTENT_PROJECT_ID || process.env.LEANTIME_PROJECT_ID || "1";
// The 4 WTUS projects in Leantime (clientId=1). Excludes id=6 "My Project" (default test project).
const WTUS_PROJECT_IDS = new Set(["2", "3", "4", "5"]);

function configured() {
  return Boolean(apiKey);
}

async function rpc<T>(method: string, params: Record<string, unknown> = {}) {
  if (!apiKey) throw new Error("LEANTIME_API_KEY is not configured");
  const response = await fetch(`${leantimeUrl}/api/jsonrpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as JsonRpcResponse<T> | null;
  if (!response.ok || payload?.error) {
    const message = typeof payload?.error === "string" ? payload.error : payload?.error?.message;
    throw new Error(message || `Leantime RPC failed: ${method}`);
  }
  return payload?.result as T;
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
        createdAt: comment.createdAt.toLocaleString(),
      })),
    };
  });
}

export async function fetchLeantimeTasks(query: LeantimeTaskQuery = {}) {
  if (!configured()) return { configured: false, tasks: [] as Task[], error: "LEANTIME_API_KEY is not configured" };

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
    return { configured: true, tasks: [] as Task[], error: error instanceof Error ? error.message : "Leantime tasks unavailable" };
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
    createdAt: comment.createdAt.toLocaleString(),
  } satisfies TaskComment;
}
