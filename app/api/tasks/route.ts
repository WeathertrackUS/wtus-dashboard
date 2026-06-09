import { NextResponse } from "next/server";
import { createLeantimeTask, fetchLeantimeTasks } from "../../../src/server/leantime";
import { requireCurrentUser } from "../../../src/server/permissions";
import type { Priority, SectionKey, Task } from "../../../src/types";

const priorities: Priority[] = ["low", "normal", "high", "urgent"];
const sectionKeys: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];

export async function POST(request: Request) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    section?: string;
    assigneeIds?: string[];
    priority?: string;
    due?: string;
    notes?: string;
    isRecurring?: boolean;
    recurringPattern?: string;
  } | null;

  const title = body?.title?.trim();
  const sectionKey = sectionKeys.find((key) => key === body?.section) ?? "development";
  const priority = priorities.find((item) => item === body?.priority) ?? "normal";

  if (!title) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  const task = await createLeantimeTask({
    title,
    description: body?.notes?.trim() || undefined,
    section: sectionKey,
    priority,
    dueAt: body?.due,
    assigneeId: body?.assigneeIds?.[0],
  });

  return NextResponse.json({ task }, { status: 201 });
}

export async function GET(request: Request) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const url = new URL(request.url);
  const section = url.searchParams.get("section") as SectionKey | null;
  const priority = url.searchParams.get("priority") as Priority | null;
  const assigneeId = url.searchParams.get("assigneeId") ?? undefined;
  const status = url.searchParams.get("status") as Task["status"] | null;
  const label = url.searchParams.get("label") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 50);

  const result = await fetchLeantimeTasks({
    section: section ?? undefined,
    priority: priority ?? undefined,
    assigneeId,
    status: status ?? undefined,
    label,
    limit: Number.isFinite(limit) ? limit : 50,
  });

  const hasError = "error" in result && Boolean(result.error);
  return NextResponse.json(result, hasError ? { status: result.configured ? 502 : 200 } : undefined);
}
