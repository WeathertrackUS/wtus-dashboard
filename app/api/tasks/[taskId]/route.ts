import { deleteLeantimeTask, updateLeantimeTask } from "../../../../src/server/leantime";
import { requirePermission } from "../../../../src/server/permissions";
import { UpdateTaskSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const parsed = await parseBody(UpdateTaskSchema, request);
  if ("error" in parsed) return parsed.error;

  const { title, status, priority, section, assigneeIds, assigneeId, due, notes } = parsed.data;

  const access = await requirePermission("tasks:update", { section });
  if ("response" in access) return access.response;

  const { taskId } = await context.params;

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
  const access = await requirePermission("tasks:delete");
  if ("response" in access) return access.response;

  const { taskId } = await context.params;

  try {
    await deleteLeantimeTask(taskId);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
