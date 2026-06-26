import { prisma } from "../../../../src/db";
import { requireGlobalOperator } from "../../../../src/server/permissions";
import { CreateRoleMappingSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";

export async function GET() {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  try {
    const mappings = await prisma.discordRoleMapping.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json(mappings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateRoleMappingSchema, request);
  if ("error" in parsed) return parsed.error;

  const { guildId, discordRoleId, sectionKey, globalRoleKey } = parsed.data;

  try {
    const mapping = await prisma.discordRoleMapping.create({
      data: {
        guildId,
        discordRoleId,
        sectionKey: sectionKey ?? null,
        globalRoleKey: globalRoleKey ?? null,
      },
    });

    return Response.json(mapping, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
