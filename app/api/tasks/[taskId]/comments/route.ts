import { addLeantimeTaskComment } from "../../../../../src/server/leantime";
import { requirePermission, type SectionKey } from "../../../../../src/server/permissions";
import { prisma } from "../../../../../src/db";
import { CreateCommentSchema } from "../../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../../src/server/validation";

async function getTaskSection(taskId: string): Promise<SectionKey | undefined> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { section: { select: { key: true } } },
  });
  return task?.section?.key as SectionKey | undefined;
}

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const taskSection = await getTaskSection(taskId);
  const access = await requirePermission("comments:create", { section: taskSection });
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateCommentSchema, request);
  if ("error" in parsed) return parsed.error;

  try {
    const comment = await addLeantimeTaskComment(taskId, parsed.data.body.trim());
    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
