import { prisma } from "../../../src/db";
import { requireCurrentUser } from "../../../src/server/permissions";
import { CreateWorkSubmissionSchema } from "../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../src/server/validation";
import { apiError } from "../../../src/server/api-response";
import type { WorkSubmission } from "../../../src/types";

function toSubmission(submission: Awaited<ReturnType<typeof prisma.workSubmission.create>>): WorkSubmission {
  return {
    id: submission.id,
    memberId: submission.userId,
    title: submission.title,
    workDate: submission.workDate.toISOString().slice(0, 10),
    platform: submission.platform,
    contentType: submission.contentType as WorkSubmission["contentType"],
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

  const parsed = await parseBody(CreateWorkSubmissionSchema, request);
  if ("error" in parsed) return parsed.error;

  const { title, workDate, platform, contentType, memberRole, description, assetUrl, skills, notable } = parsed.data;
  const targetMemberId = parsed.data.memberId || access.access.userId;

  const canSubmitForTarget = targetMemberId === access.access.userId || access.access.globalRoles.includes("owner") || access.access.globalRoles.includes("operations_lead");
  if (!canSubmitForTarget) return apiError("You can only submit your own work", 403);

  try {
    const submission = await prisma.workSubmission.create({
      data: {
        userId: targetMemberId,
        title: title.trim(),
        workDate: new Date(workDate),
        platform: platform.trim(),
        contentType,
        memberRole: memberRole?.trim() || "Contributor",
        description: description?.trim() || "",
        assetUrl: assetUrl?.trim() || null,
        skills: skills?.filter(Boolean) ?? [],
        notable: notable ?? false,
      },
    });

    return Response.json({ submission: toSubmission(submission) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
