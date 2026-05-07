import { NextResponse } from "next/server";
import { prisma } from "../../../src/db";
import { requireGlobalOperator } from "../../../src/server/permissions";
import type { LiveEvent } from "../../../src/types";

function parseDate(value?: string) {
  if (!value || value.toLowerCase() === "now") return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    description?: string;
    startsAt?: string;
    briefing?: string;
    roleName?: string;
  } | null;

  const name = body?.name?.trim();
  const roleName = body?.roleName?.trim();

  if (!name || !roleName) {
    return NextResponse.json({ error: "Event name and first role are required" }, { status: 400 });
  }

  const liveEvent = await prisma.liveEvent.create({
    data: {
      name,
      description: body?.description?.trim() || null,
      status: "active",
      startsAt: parseDate(body?.startsAt),
      briefing: body?.briefing?.trim() || null,
      createdById: access.access.userId,
      roles: {
        create: {
          name: roleName,
          description: "Custom event role",
        },
      },
    },
    include: { roles: true, assignments: true },
  });

  const event: LiveEvent = {
    id: liveEvent.id,
    name: liveEvent.name,
    description: liveEvent.description ?? "",
    status: liveEvent.status,
    startsAt: liveEvent.startsAt.toISOString(),
    endsAt: liveEvent.endsAt?.toISOString(),
    briefing: liveEvent.briefing ?? "",
    roles: liveEvent.roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description ?? "",
    })),
    assignments: [],
  };

  return NextResponse.json({ event }, { status: 201 });
}
