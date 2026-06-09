import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import { requireCurrentUser } from "../../../../src/server/permissions";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { id } = await params;

  const window = await prisma.availabilityWindow.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!window) {
    return NextResponse.json({ error: "Availability window not found" }, { status: 404 });
  }

  if (window.userId !== access.access.userId) {
    return NextResponse.json({ error: "You can only delete your own availability" }, { status: 403 });
  }

  await prisma.availabilityWindow.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
