import { createLeantimeTask, fetchLeantimeTasks } from "../../../src/server/leantime";
import { requirePermission, type SectionKey } from "../../../src/server/permissions";
import { CreateTaskSchema, TaskQuerySchema } from "../../../src/server/schemas";
import { parseBody, parseQueryParams, handleApiError } from "../../../src/server/validation";

export async function POST(request: Request) {
  const parsed = await parseBody(CreateTaskSchema, request);
  if ("error" in parsed) return parsed.error;

  const { title, section, priority, assigneeIds, due, notes } = parsed.data;

  const access = await requirePermission("tasks:create", { section: section as SectionKey | undefined });
  if ("response" in access) return access.response;

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
  const url = new URL(request.url);
  const parsed = parseQueryParams(TaskQuerySchema, url);
  if ("error" in parsed) return parsed.error;

  const { section, priority, status, assigneeId, label, limit } = parsed.data;

  const access = await requirePermission("tasks:read", { section: section as SectionKey | undefined });
  if ("response" in access) return access.response;

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
      const httpStatus = result.errorKind === "not_configured" ? 200 : result.errorKind === "timeout" ? 503 : 502;
      return Response.json(result, { status: httpStatus });
    }

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
