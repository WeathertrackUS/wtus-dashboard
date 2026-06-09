import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import { requireGlobalOperator } from "../../../../src/server/permissions";

export async function GET() {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const channels = await prisma.discordAlertChannel.findMany({
    include: { section: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(channels);
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const body = (await request.json()) as {
    guildId: string;
    channelId: string;
    alertType: string;
    sectionId?: string | null;
  };

  const channel = await prisma.discordAlertChannel.create({
    data: {
      guildId: body.guildId,
      channelId: body.channelId,
      alertType: body.alertType,
      sectionId: body.sectionId,
    },
  });

  return NextResponse.json(channel, { status: 201 });
}
