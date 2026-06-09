import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/db";
import { requireGlobalOperator } from "../../../../../src/server/permissions";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const body = (await request.json()) as {
    guildId?: string;
    channelId?: string;
    alertType?: string;
    sectionId?: string | null;
  };

  const channel = await prisma.discordAlertChannel.update({
    where: { id },
    data: {
      ...(body.guildId !== undefined && { guildId: body.guildId }),
      ...(body.channelId !== undefined && { channelId: body.channelId }),
      ...(body.alertType !== undefined && { alertType: body.alertType }),
      ...(body.sectionId !== undefined && { sectionId: body.sectionId }),
    },
  });

  return NextResponse.json(channel);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  await prisma.discordAlertChannel.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
