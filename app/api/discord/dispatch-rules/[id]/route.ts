import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/db";
import { requireGlobalOperator } from "../../../../../src/server/permissions";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const body = (await request.json()) as {
    eventType?: string;
    name?: string;
    description?: string | null;
    channelId?: string | null;
    pingRoleIds?: string[];
    pingUserIds?: string[];
    isActive?: boolean;
  };

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

  return NextResponse.json(rule);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  await prisma.dispatchRule.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
