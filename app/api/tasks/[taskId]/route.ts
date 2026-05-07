import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import { canWorkInSection, isGlobalOperator, requireCurrentUser } from "../../../../src/server/permissions";
import type { Priority, SectionKey, Task, TaskComment, TaskStatus } from "../../../../src/types";

const statuses: TaskStatus[] = ["todo", "in_progress", "blocked", "review", "done"];
const priorities: Priority[] = ["low", "normal", "high", "urgent"];
const sectionKeys: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: Task["status"];
  priority: Task["priority"];
  assigneeId: string | null;
  createdById: string | null;
  dueAt: Date | null;
  section: { key: Task["section"] } | null;
  comments?: Array<{
    id: string;
    taskId: string;
    userId: string | null;
    body: string;
    createdAt: Date;
    user?: { name: string | null; discordHandle: string | null } | null;
  }>;
}): Task {
  return {
    id: task.id,
    title: task.title,
    section: task.section?.key ?? "development",
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? "",
    ownerId: task.createdById ?? task.assigneeId ?? "",
    due: task.dueAt ? task.dueAt.toLocaleDateString() : "",
    notes: task.description ?? "",
    comments: task.comments?.map<TaskComment>((comment) => ({
      id: comment.id,
      taskId: comment.taskId,
      userId: comment.userId ?? undefined,
      authorName: comment.user?.name ?? comment.user?.discordHandle ?? undefined,
      body: comment.body,
      createdAt: comment.createdAt.toLocaleString(),
    })) ?? [],
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { taskId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    status?: string;
    priority?: string;
    section?: string;
    assigneeId?: string;
    due?: string;
    notes?: string;
  } | null;
  const status = body?.status ? statuses.find((item) => item === body.status) : undefined;

  if (body?.status && !status) {
    return NextResponse.json({ error: "Unsupported task status" }, { status: 400 });
  }

  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: { section: true },
  });

  if (!existingTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const canUpdateTask =
    isGlobalOperator(access.access) ||
    existingTask.createdById === access.access.userId ||
    existingTask.assigneeId === access.access.userId ||
    canWorkInSection(access.access, existingTask.section?.key);

  if (!canUpdateTask) {
    return NextResponse.json({ error: "Task access required" }, { status: 403 });
  }

  const sectionKey = sectionKeys.find((item) => item === body?.section);
  const section = sectionKey ? await prisma.section.findUnique({ where: { key: sectionKey } }) : undefined;
  const priority = body?.priority ? priorities.find((item) => item === body.priority) : undefined;
  const dueAt = parseDate(body?.due);

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: body?.title?.trim() || undefined,
      description: body?.notes !== undefined ? body.notes.trim() || null : undefined,
      sectionId: section?.id,
      assigneeId: body?.assigneeId !== undefined ? body.assigneeId || null : undefined,
      priority,
      status,
      completedAt: status ? (status === "done" ? new Date() : null) : undefined,
      dueAt,
    },
    include: {
      section: true,
      comments: {
        orderBy: { createdAt: "desc" },
        include: { user: true },
      },
    },
  });

  return NextResponse.json({ task: toTask(task) });
}
