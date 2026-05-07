import { NextResponse } from "next/server";
import { prisma } from "../../../src/db";
import type { Priority, SectionKey, Task } from "../../../src/types";

const priorities: Priority[] = ["low", "normal", "high", "urgent"];
const sectionKeys: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: Task["status"];
  priority: Task["priority"];
  assigneeId: string | null;
  createdById: string | null;
  dueAt: Date | null;
  section: { key: SectionKey } | null;
}): Task {
  return {
    id: task.id,
    title: task.title,
    section: task.section?.key ?? "development",
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? "",
    ownerId: task.createdById ?? task.assigneeId ?? "",
    due: task.dueAt ? task.dueAt.toLocaleDateString() : "",
    notes: task.description ?? "",
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    section?: string;
    assigneeId?: string;
    priority?: string;
    due?: string;
    notes?: string;
  } | null;

  const title = body?.title?.trim();
  const sectionKey = sectionKeys.find((key) => key === body?.section) ?? "development";
  const priority = priorities.find((item) => item === body?.priority) ?? "normal";

  if (!title) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  const section = await prisma.section.findUnique({ where: { key: sectionKey } });
  const task = await prisma.task.create({
    data: {
      title,
      description: body?.notes?.trim() || null,
      sectionId: section?.id,
      assigneeId: body?.assigneeId || null,
      priority,
      dueAt: parseDate(body?.due),
    },
    include: { section: true },
  });

  return NextResponse.json({ task: toTask(task) }, { status: 201 });
}
