import { prisma } from "../../../../src/db";
import { requireGlobalOperator } from "../../../../src/server/permissions";
import { CreateDispatchRuleSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";

export async function GET() {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  try {
    const rules = await prisma.dispatchRule.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json(rules);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateDispatchRuleSchema, request);
  if ("error" in parsed) return parsed.error;

  const { eventType, name, description, channelId, pingRoleIds, pingUserIds } = parsed.data;

  try {
    const rule = await prisma.dispatchRule.create({
      data: {
        eventType,
        name,
        description: description ?? null,
        channelId: channelId ?? null,
        pingRoleIds: pingRoleIds ?? [],
        pingUserIds: pingUserIds ?? [],
      },
    });

    return Response.json(rule, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
