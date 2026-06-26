import { prisma } from "../../../../../src/db";
import { requireGlobalOperator } from "../../../../../src/server/permissions";
import { UpdateRoleMappingSchema } from "../../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../../src/server/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = await parseBody(UpdateRoleMappingSchema, request);
  if ("error" in parsed) return parsed.error;

  const body = parsed.data;

  try {
    const mapping = await prisma.discordRoleMapping.update({
      where: { id },
      data: {
        ...(body.guildId !== undefined && { guildId: body.guildId }),
        ...(body.discordRoleId !== undefined && { discordRoleId: body.discordRoleId }),
        ...(body.sectionKey !== undefined && { sectionKey: body.sectionKey }),
        ...(body.globalRoleKey !== undefined && { globalRoleKey: body.globalRoleKey }),
      },
    });

    return Response.json(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;

  try {
    await prisma.discordRoleMapping.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
