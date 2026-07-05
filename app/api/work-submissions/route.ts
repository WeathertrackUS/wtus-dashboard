import { prisma } from "../../../src/db";
import { requirePermission, requireCurrentUser } from "../../../src/server/permissions";
import { CreateWorkSubmissionSchema } from "../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../src/server/validation";
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
  const parsed = await parseBody(CreateWorkSubmissionSchema, request);
  if ("error" in parsed) return parsed.error;

  const { title, workDate, platform, contentType, memberRole, description, assetUrl, skills, notable } = parsed.data;

  const user = await requireCurrentUser();
  if ("response" in user) return user.response;
  const effectiveMemberId = parsed.data.memberId || user.access.userId;

  const access = await requirePermission("work_submissions:create", { resourceOwnerId: effectiveMemberId });
  if ("response" in access) return access.response;

  try {
    const submission = await prisma.workSubmission.create({
      data: {
        userId: effectiveMemberId,
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
