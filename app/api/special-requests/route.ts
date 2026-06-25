import { NextResponse } from "next/server";
import { prisma } from "../../../src/db";
import { requireGlobalOperator } from "../../../src/server/permissions";
import type { SpecialRequest } from "../../../src/types";

function toSpecialRequest(request: Awaited<ReturnType<typeof prisma.specialRequest.create>>): SpecialRequest {
  return {
    id: request.id,
    memberId: request.targetUserId,
    createdById: request.createdById ?? undefined,
    title: request.title,
    prompt: request.prompt,
    role: request.role,
    platform: request.platform ?? undefined,
    dueAt: request.dueAt?.toISOString(),
    status: request.status,
    responseNote: request.responseNote ?? "",
    createdAt: request.createdAt.toISOString(),
  };
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const targetUserId = String(body?.memberId || "");
  const title = String(body?.title || "").trim();
  const prompt = String(body?.prompt || "").trim();
  const role = String(body?.role || "").trim();

  if (!targetUserId || !title || !prompt || !role) {
    return NextResponse.json({ error: "Member, title, prompt, and role are required" }, { status: 400 });
  }

  const dueAt = body?.dueAt ? new Date(String(body.dueAt)) : null;
  const specialRequest = await prisma.specialRequest.create({
    data: {
      targetUserId,
      createdById: access.access.userId,
      title,
      prompt,
      role,
      platform: String(body?.platform || "").trim() || null,
      dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
    },
  });

  return NextResponse.json({ specialRequest: toSpecialRequest(specialRequest) }, { status: 201 });
}
