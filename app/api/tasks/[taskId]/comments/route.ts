import { addLeantimeTaskComment } from "../../../../../src/server/leantime";
import { requireCurrentUser } from "../../../../../src/server/permissions";
import { CreateCommentSchema } from "../../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../../src/server/validation";

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { taskId } = await context.params;
  const parsed = await parseBody(CreateCommentSchema, request);
  if ("error" in parsed) return parsed.error;

  try {
    const comment = await addLeantimeTaskComment(taskId, parsed.data.body.trim());
    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
