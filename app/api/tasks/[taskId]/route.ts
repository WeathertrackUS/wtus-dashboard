import { deleteLeantimeTask, updateLeantimeTask } from "../../../../src/server/leantime";
import { isGlobalOperator, requireCurrentUser } from "../../../../src/server/permissions";
import { apiError } from "../../../../src/server/api-response";
import { UpdateTaskSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;
  if (!isGlobalOperator(access.access)) {
    return apiError("Task access required", 403);
  }

  const { taskId } = await context.params;
  const parsed = await parseBody(UpdateTaskSchema, request);
  if ("error" in parsed) return parsed.error;

  const { title, status, priority, section, assigneeIds, assigneeId, due, notes } = parsed.data;

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
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;
  if (!isGlobalOperator(access.access)) {
    return apiError("Task access required", 403);
  }

  const { taskId } = await context.params;

  try {
    await deleteLeantimeTask(taskId);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
