import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import { requireGlobalOperator } from "../../../../src/server/permissions";

export async function GET() {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const rules = await prisma.dispatchRule.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const body = (await request.json()) as {
    eventType: string;
    name: string;
    description?: string;
    channelId?: string | null;
    pingRoleIds?: string[];
    pingUserIds?: string[];
  };

  const rule = await prisma.dispatchRule.create({
    data: {
      eventType: body.eventType,
      name: body.name,
      description: body.description,
      channelId: body.channelId,
      pingRoleIds: body.pingRoleIds ?? [],
      pingUserIds: body.pingUserIds ?? [],
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
