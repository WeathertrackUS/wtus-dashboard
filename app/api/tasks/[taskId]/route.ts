import { NextResponse } from "next/server";
import { deleteLeantimeTask, updateLeantimeTask } from "../../../../src/server/leantime";
import { isGlobalOperator, requireCurrentUser } from "../../../../src/server/permissions";
import type { Task, TaskStatus } from "../../../../src/types";

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;
  if (!isGlobalOperator(access.access)) {
    return NextResponse.json({ error: "Task access required" }, { status: 403 });
  }

  const { taskId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    status?: string;
    priority?: string;
    section?: string;
    assigneeId?: string;
    assigneeIds?: string[];
    due?: string;
    notes?: string;
    isRecurring?: boolean;
    recurringPattern?: string;
  } | null;

  const task = await updateLeantimeTask(taskId, {
    title: body?.title?.trim(),
    description: body?.notes,
    section: body?.section as Task["section"] | undefined,
    assigneeId: body?.assigneeIds?.[0] ?? body?.assigneeId,
    priority: body?.priority as Task["priority"] | undefined,
    dueAt: body?.due,
    status: body?.status as TaskStatus | undefined,
  });

  return NextResponse.json({ task });
}

export async function DELETE(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;
  if (!isGlobalOperator(access.access)) {
    return NextResponse.json({ error: "Task access required" }, { status: 403 });
  }

  const { taskId } = await context.params;
  await deleteLeantimeTask(taskId);
  return NextResponse.json({ success: true });
}
