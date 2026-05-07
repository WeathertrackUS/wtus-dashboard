import { NextResponse } from "next/server";
import { getDashboardData } from "../../../src/server/dashboard-data";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Dashboard data is unavailable" }, { status: 503 });
  }
}
