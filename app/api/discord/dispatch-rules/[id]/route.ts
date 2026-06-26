import { prisma } from "../../../../../src/db";
import { requireGlobalOperator } from "../../../../../src/server/permissions";
import { UpdateDispatchRuleSchema } from "../../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../../src/server/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = await parseBody(UpdateDispatchRuleSchema, request);
  if ("error" in parsed) return parsed.error;

  const body = parsed.data;

  try {
    const rule = await prisma.dispatchRule.update({
      where: { id },
      data: {
        ...(body.eventType !== undefined && { eventType: body.eventType }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.channelId !== undefined && { channelId: body.channelId }),
        ...(body.pingRoleIds !== undefined && { pingRoleIds: body.pingRoleIds }),
        ...(body.pingUserIds !== undefined && { pingUserIds: body.pingUserIds }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return Response.json(rule);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;

  try {
    await prisma.dispatchRule.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
