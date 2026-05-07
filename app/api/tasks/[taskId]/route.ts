import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import type { Task, TaskStatus } from "../../../../src/types";

const statuses: TaskStatus[] = ["todo", "in_progress", "blocked", "review", "done"];

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
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = statuses.find((item) => item === body?.status);

  if (!status) {
    return NextResponse.json({ error: "Unsupported task status" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "done" ? new Date() : null,
    },
    include: { section: true },
  });

  return NextResponse.json({ task: toTask(task) });
}
