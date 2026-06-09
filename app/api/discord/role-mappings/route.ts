import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import { requireGlobalOperator } from "../../../../src/server/permissions";

export async function GET() {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const mappings = await prisma.discordRoleMapping.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(mappings);
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const body = (await request.json()) as {
    guildId: string;
    discordRoleId: string;
    sectionKey?: string | null;
    globalRoleKey?: string | null;
  };

  const mapping = await prisma.discordRoleMapping.create({
    data: {
      guildId: body.guildId,
      discordRoleId: body.discordRoleId,
      sectionKey: body.sectionKey as never ?? null,
      globalRoleKey: body.globalRoleKey as never ?? null,
    },
  });

  return NextResponse.json(mapping, { status: 201 });
}
