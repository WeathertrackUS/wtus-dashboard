import { prisma } from "../../../../src/db";
import { requireGlobalOperator } from "../../../../src/server/permissions";
import { CreateAlertChannelSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";

export async function GET() {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  try {
    const channels = await prisma.discordAlertChannel.findMany({
      include: { section: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(channels);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateAlertChannelSchema, request);
  if ("error" in parsed) return parsed.error;

  const { guildId, channelId, alertType, sectionId } = parsed.data;

  try {
    const channel = await prisma.discordAlertChannel.create({
      data: {
        guildId,
        channelId,
        alertType,
        sectionId: sectionId ?? null,
      },
    });

    return Response.json(channel, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
