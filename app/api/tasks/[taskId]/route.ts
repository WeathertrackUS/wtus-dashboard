import { deleteLeantimeTask, updateLeantimeTask } from "../../../../src/server/leantime";
import { requirePermission, type SectionKey } from "../../../../src/server/permissions";
import { prisma } from "../../../../src/db";
import { UpdateTaskSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";

async function getTaskSection(taskId: string): Promise<SectionKey | undefined> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { section: { select: { key: true } } },
  });
  return task?.section?.key as SectionKey | undefined;
}

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const parsed = await parseBody(UpdateTaskSchema, request);
  if ("error" in parsed) return parsed.error;

  const { title, status, priority, section, assigneeIds, assigneeId, due, notes } = parsed.data;

  const { taskId } = await context.params;

  const taskSection = await getTaskSection(taskId);
  const access = await requirePermission("tasks:update", { section: taskSection });
  if ("response" in access) return access.response;

  try {
    const task = await updateLeantimeTask(taskId, {
      title: title?.trim(),
      description: notes,
      section,
      assigneeId: assigneeIds?.[0] ?? assigneeId,
      priority,
      dueAt: due,
      status,
    });

    return Response.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const taskSection = await getTaskSection(taskId);
  const access = await requirePermission("tasks:delete", { section: taskSection });
  if ("response" in access) return access.response;

  try {
    await deleteLeantimeTask(taskId);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
