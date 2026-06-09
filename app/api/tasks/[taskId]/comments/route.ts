import { NextResponse } from "next/server";
import { addLeantimeTaskComment } from "../../../../../src/server/leantime";
import { requireCurrentUser } from "../../../../../src/server/permissions";

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { taskId } = await context.params;
  const body = (await request.json().catch(() => null)) as { body?: string } | null;
  const commentBody = body?.body?.trim();

  if (!commentBody) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  const comment = await addLeantimeTaskComment(taskId, commentBody);
  return NextResponse.json({ comment }, { status: 201 });
}
