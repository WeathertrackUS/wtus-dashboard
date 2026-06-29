import { createLeantimeTask, fetchLeantimeTasks } from "../../../src/server/leantime";
import { requireCurrentUser } from "../../../src/server/permissions";
import { CreateTaskSchema, TaskQuerySchema } from "../../../src/server/schemas";
import { parseBody, parseQueryParams, handleApiError } from "../../../src/server/validation";

export async function POST(request: Request) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateTaskSchema, request);
  if ("error" in parsed) return parsed.error;

  const { title, section, priority, assigneeIds, due, notes } = parsed.data;

  try {
    const task = await createLeantimeTask({
      title: title.trim(),
      description: notes?.trim() || undefined,
      section,
      priority,
      dueAt: due,
      assigneeId: assigneeIds?.[0],
    });

    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const url = new URL(request.url);
  const parsed = parseQueryParams(TaskQuerySchema, url);
  if ("error" in parsed) return parsed.error;

  const { section, priority, status, assigneeId, label, limit } = parsed.data;

  try {
    const result = await fetchLeantimeTasks({
      section,
      priority,
      assigneeId,
      status,
      label,
      limit,
    });

    if (result.degraded && result.error) {
      const status = result.errorKind === "not_configured" ? 200 : result.errorKind === "timeout" ? 503 : 502;
      return Response.json(result, { status });
    }

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
