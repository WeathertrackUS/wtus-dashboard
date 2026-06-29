import { prisma } from "../../../src/db";

export type SpecialRequestResponse = "accepted" | "declined";

export type RespondToSpecialRequestResult =
  | { ok: true; status: SpecialRequestResponse }
  | { ok: false; reason: "not_found" | "already_handled" };

export async function respondToSpecialRequest(
  requestId: string,
  targetUserId: string,
  response: SpecialRequestResponse,
): Promise<RespondToSpecialRequestResult> {
  const result = await prisma.specialRequest.updateMany({
    where: { id: requestId, targetUserId, status: "open" },
    data: { status: response, respondedAt: new Date() },
  });

  if (result.count > 0) {
    return { ok: true, status: response };
  }

  const existing = await prisma.specialRequest.findUnique({
    where: { id: requestId },
    select: { targetUserId: true },
  });

  if (!existing || existing.targetUserId !== targetUserId) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: false, reason: "already_handled" };
}
