import { prisma } from "../../../../../src/db";
import { requireGlobalOperator } from "../../../../../src/server/permissions";
import { UpdateAlertChannelSchema } from "../../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../../src/server/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = await parseBody(UpdateAlertChannelSchema, request);
  if ("error" in parsed) return parsed.error;

  const body = parsed.data;

  try {
    const channel = await prisma.discordAlertChannel.update({
      where: { id },
      data: {
        ...(body.guildId !== undefined && { guildId: body.guildId }),
        ...(body.channelId !== undefined && { channelId: body.channelId }),
        ...(body.alertType !== undefined && { alertType: body.alertType }),
        ...(body.sectionId !== undefined && { sectionId: body.sectionId }),
      },
    });

    return Response.json(channel);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;

  try {
    await prisma.discordAlertChannel.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
