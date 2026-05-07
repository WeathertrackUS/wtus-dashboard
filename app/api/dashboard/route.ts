import { NextResponse } from "next/server";
import { getDashboardData } from "../../../src/server/dashboard-data";
import { requireCurrentUser } from "../../../src/server/permissions";

export async function GET() {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Dashboard data is unavailable" }, { status: 503 });
  }
}
