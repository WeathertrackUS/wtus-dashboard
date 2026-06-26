import { NextResponse } from "next/server";
import { getDashboardData } from "../../../src/server/dashboard-data";
import { requireCurrentUser } from "../../../src/server/permissions";
import { apiError } from "../../../src/server/api-response";

export async function GET() {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  try {
    const data = await getDashboardData();
    return Response.json(data);
  } catch {
    return apiError("Dashboard data is unavailable", 503);
  }
}
