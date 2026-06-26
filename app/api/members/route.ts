import { prisma } from "../../../src/db";
import { requireGlobalOperator } from "../../../src/server/permissions";
import { CreateMemberSchema } from "../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../src/server/validation";
import type { Member, SectionKey } from "../../../src/types";

function toMember(user: {
  id: string;
  name: string | null;
  handle: string | null;
  discordHandle: string | null;
  email: string | null;
  discordUserId: string | null;
  onboardingStatus: "pending" | "verified";
  globalRoles: Array<{ role: { key: string } }>;
  sectionMemberships: Array<{ role: "lead" | "member"; section: { key: SectionKey } }>;
}): Member {
  return {
    id: user.id,
    name: user.name ?? "Unnamed member",
    handle: user.handle ?? user.discordHandle ?? user.email ?? "member",
    discordUserId: user.discordUserId ?? undefined,
    onboardingStatus: user.onboardingStatus,
    globalRoles: user.globalRoles.map((assignment) => assignment.role.key),
    sections: user.sectionMemberships.map((membership) => ({
      section: membership.section.key,
      role: membership.role,
    })),
  };
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateMemberSchema, request);
  if ("error" in parsed) return parsed.error;

  const { name, handle, globalRole, section, sectionRole } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [globalRoleRecord, sectionRecord] = await Promise.all([
        tx.globalRole.findUnique({ where: { key: globalRole } }),
        section ? tx.section.findUnique({ where: { key: section } }) : Promise.resolve(null),
      ]);
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          handle: handle.trim().replace(/^@/, ""),
          status: "invited",
          onboardingStatus: "pending",
        },
      });

      if (globalRoleRecord) {
        await tx.userGlobalRole.create({ data: { userId: user.id, roleId: globalRoleRecord.id } });
      }

      if (sectionRecord) {
        await tx.sectionMembership.create({ data: { userId: user.id, sectionId: sectionRecord.id, role: sectionRole } });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          globalRoles: { include: { role: true } },
          sectionMemberships: { include: { section: true } },
        },
      });
    });

    return Response.json({ member: toMember(result) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
