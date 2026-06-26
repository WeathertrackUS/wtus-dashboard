import { getMemberDashboardData, getLeadDashboardData, getOperatorDashboardData } from "../../../src/server/dashboard-data";
import { requireCurrentUser, isGlobalOperator } from "../../../src/server/permissions";
import { apiError } from "../../../src/server/api-response";

function isSectionLead(access: { sections: Array<{ role: string }> }) {
  return access.sections.some((s) => s.role === "lead");
}

export async function GET() {
  const result = await requireCurrentUser();
  if ("response" in result) return result.response;

  try {
    const data = isGlobalOperator(result.access)
      ? await getOperatorDashboardData()
      : isSectionLead(result.access)
        ? await getLeadDashboardData(result.access.sections)
        : await getMemberDashboardData();
    return Response.json(data);
  } catch {
    return apiError("Dashboard data is unavailable", 503);
  }
}
