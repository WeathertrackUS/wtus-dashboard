import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/db";
import { requireCurrentUser } from "../../../../../src/server/permissions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { id } = await params;

  const schedule = await prisma.recurringAvailability.findUnique({ where: { id } });
  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  if (schedule.userId !== access.access.userId) {
    return NextResponse.json({ error: "You can only delete your own schedules" }, { status: 403 });
  }

  await prisma.recurringAvailability.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
