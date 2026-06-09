import { NextResponse } from "next/server";
import { prisma } from "../../../src/db";
import { requireCurrentUser } from "../../../src/server/permissions";
import type { WorkSubmission, WorkSubmissionType } from "../../../src/types";

const contentTypes: WorkSubmissionType[] = [
  "social_graphic",
  "forecast_discussion",
  "radar_post",
  "spc_explainer",
  "wpc_explainer",
  "nhc_explainer",
  "model_graphic",
  "recap_graphic",
  "video_clip",
  "other",
];

function toSubmission(submission: Awaited<ReturnType<typeof prisma.workSubmission.create>>): WorkSubmission {
  return {
    id: submission.id,
    memberId: submission.userId,
    title: submission.title,
    workDate: submission.workDate.toISOString().slice(0, 10),
    platform: submission.platform,
    contentType: submission.contentType,
    memberRole: submission.memberRole,
    description: submission.description,
    assetUrl: submission.assetUrl ?? "",
    skills: submission.skills,
    notable: submission.notable,
  };
}

export async function POST(request: Request) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const title = String(body?.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const memberId = String(body?.memberId || access.access.userId);
  const canSubmitForTarget = memberId === access.access.userId || access.access.globalRoles.includes("owner") || access.access.globalRoles.includes("operations_lead");
  if (!canSubmitForTarget) return NextResponse.json({ error: "You can only submit your own work" }, { status: 403 });

  const workDate = new Date(String(body?.workDate || new Date().toISOString()));
  const submission = await prisma.workSubmission.create({
    data: {
      userId: memberId,
      title,
      workDate: Number.isNaN(workDate.getTime()) ? new Date() : workDate,
      platform: String(body?.platform || "WTUS").trim(),
      contentType: contentTypes.find((item) => item === body?.contentType) ?? "other",
      memberRole: String(body?.memberRole || "Contributor").trim(),
      description: String(body?.description || "").trim(),
      assetUrl: String(body?.assetUrl || "").trim() || null,
      skills: Array.isArray(body?.skills) ? body.skills.map(String).filter(Boolean) : [],
      notable: Boolean(body?.notable),
    },
  });

  return NextResponse.json({ submission: toSubmission(submission) }, { status: 201 });
}
