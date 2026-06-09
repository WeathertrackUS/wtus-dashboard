import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/db";
import { requireGlobalOperator } from "../../../../../src/server/permissions";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const body = (await request.json()) as {
    guildId?: string;
    discordRoleId?: string;
    sectionKey?: string | null;
    globalRoleKey?: string | null;
  };

  const mapping = await prisma.discordRoleMapping.update({
    where: { id },
    data: {
      ...(body.guildId !== undefined && { guildId: body.guildId }),
      ...(body.discordRoleId !== undefined && { discordRoleId: body.discordRoleId }),
      ...(body.sectionKey !== undefined && { sectionKey: body.sectionKey as never }),
      ...(body.globalRoleKey !== undefined && { globalRoleKey: body.globalRoleKey as never }),
    },
  });

  return NextResponse.json(mapping);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  await prisma.discordRoleMapping.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
