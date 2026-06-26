import { prisma } from "../../../src/db";
import { requireGlobalOperator } from "../../../src/server/permissions";
import { CreateSpecialRequestSchema } from "../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../src/server/validation";
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
    status: request.status as SpecialRequest["status"],
    responseNote: request.responseNote ?? "",
    createdAt: request.createdAt.toISOString(),
  };
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateSpecialRequestSchema, request);
  if ("error" in parsed) return parsed.error;

  const { memberId, title, prompt, role, platform, dueAt } = parsed.data;

  try {
    const specialRequest = await prisma.specialRequest.create({
      data: {
        targetUserId: memberId,
        createdById: access.access.userId,
        title: title.trim(),
        prompt: prompt.trim(),
        role: role.trim(),
        platform: platform?.trim() || null,
        dueAt: dueAt ? new Date(dueAt) : null,
      },
    });

    return Response.json({ specialRequest: toSpecialRequest(specialRequest) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
