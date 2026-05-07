import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/db";
import { canWorkInSection, isGlobalOperator, requireCurrentUser } from "../../../../../src/server/permissions";
import type { TaskComment } from "../../../../../src/types";

function toComment(comment: {
  id: string;
  taskId: string;
  userId: string | null;
  body: string;
  createdAt: Date;
  user: { name: string | null; discordHandle: string | null } | null;
}): TaskComment {
  return {
    id: comment.id,
    taskId: comment.taskId,
    userId: comment.userId ?? undefined,
    authorName: comment.user?.name ?? comment.user?.discordHandle ?? undefined,
    body: comment.body,
    createdAt: comment.createdAt.toLocaleString(),
  };
}

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { taskId } = await context.params;
  const body = (await request.json().catch(() => null)) as { body?: string } | null;
  const commentBody = body?.body?.trim();

  if (!commentBody) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { section: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const canComment =
    isGlobalOperator(access.access) ||
    task.createdById === access.access.userId ||
    task.assigneeId === access.access.userId ||
    canWorkInSection(access.access, task.section?.key);

  if (!canComment) {
    return NextResponse.json({ error: "Task access required" }, { status: 403 });
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      userId: access.access.userId,
      body: commentBody,
    },
    include: { user: true },
  });

  return NextResponse.json({ comment: toComment(comment) }, { status: 201 });
}
