import { NextResponse } from "next/server";
import { getMemberDashboardData, getOperatorDashboardData } from "../../../src/server/dashboard-data";
import { requireCurrentUser, isGlobalOperator } from "../../../src/server/permissions";

export async function GET() {
  const result = await requireCurrentUser();
  if ("response" in result) return result.response;

  try {
    const data = isGlobalOperator(result.access)
      ? await getOperatorDashboardData()
      : await getMemberDashboardData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Dashboard data is unavailable" }, { status: 503 });
  }
}
