import { NextRequest, NextResponse } from "next/server";
import {
  createTask,
  dateFromTask,
  fetchAllTasks,
  formatDailyName,
  formatParentName,
  monthFromTaskName,
  requestToken,
  taskOwner,
} from "@/lib/notebookClickup";

interface GenerateMonthRequest {
  month: string; // "YYYY-MM"
  member: {
    id: string;
    name: string;
  };
}

function getWeekdaysInMonth(monthStr: string): string[] {
  const [year, month] = monthStr.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return [];

  // Get total days in month
  const totalDays = new Date(year, month, 0).getDate();
  const weekdays: string[] = [];

  for (let day = 1; day <= totalDays; day++) {
    // Check day of week (0 is Sunday, 6 is Saturday)
    const d = new Date(year, month - 1, day, 12, 0, 0);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      weekdays.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  return weekdays;
}

export async function POST(req: NextRequest) {
  const token = requestToken(req);
  if (!token) {
    return NextResponse.json({ error: "ClickUp authentication required." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as GenerateMonthRequest;
    if (!body?.month || !/^\d{4}-\d{2}$/.test(body.month)) {
      return NextResponse.json({ error: "A valid month in YYYY-MM format is required." }, { status: 400 });
    }
    if (!body?.member?.id || !body?.member?.name) {
      return NextResponse.json({ error: "A team member is required." }, { status: 400 });
    }

    const { month, member } = body;
    const targetWeekdays = getWeekdaysInMonth(month);
    if (!targetWeekdays.length) {
      return NextResponse.json({ error: "No weekdays found for the specified month." }, { status: 400 });
    }

    // Fetch existing tasks
    const rawTasks = await fetchAllTasks(token);
    const byId = new Map(rawTasks.map((t) => [String(t.id), t]));

    // Find or create month parent task
    let parent = rawTasks.find(
      (task) =>
        !task.parent &&
        monthFromTaskName(task.name) === month &&
        taskOwner(task, byId).id === member.id,
    );

    const numericMemberId = /^\d+$/.test(member.id) ? Number(member.id) : undefined;

    if (!parent) {
      parent = await createTask(token, {
        name: formatParentName(`${month}-01`, member),
        assignees: numericMemberId ? [numericMemberId] : [],
      });
      byId.set(String(parent.id), parent);
    }

    // Determine existing dates under this parent or matching member and date
    const existingDates = new Set<string>();
    for (const task of rawTasks) {
      if (task.parent === parent.id) {
        const d = dateFromTask(task);
        if (d && d.startsWith(month)) {
          existingDates.add(d);
        }
      }
    }

    // Missing weekdays to create
    const missingDates = targetWeekdays.filter((date) => !existingDates.has(date));

    // Create subtasks sequentially to ensure reliability and respect ClickUp rate limits
    const createdTasks: Array<{ id: string; name?: string; date: string }> = [];
    for (const date of missingDates) {
      const [year, mNum, day] = date.split("-").map(Number);
      const startOfDayUtc = Date.UTC(year, mNum - 1, day, 9, 0, 0);
      const endOfDayUtc = Date.UTC(year, mNum - 1, day, 18, 0, 0);

      const created = await createTask(token, {
        name: formatDailyName(date),
        parent: parent.id,
        assignees: numericMemberId ? [numericMemberId] : [],
        start_date: String(startOfDayUtc),
        due_date: String(endOfDayUtc),
      });

      createdTasks.push({ id: String(created.id), name: created.name, date });
    }

    return NextResponse.json({
      success: true,
      month,
      member,
      parentTaskId: parent.id,
      parentTaskName: parent.name,
      totalWeekdays: targetWeekdays.length,
      existingCount: existingDates.size,
      createdCount: createdTasks.length,
      createdTasks,
    });
  } catch (error) {
    console.error("Generate month tasks failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate month tasks in ClickUp." },
      { status: 502 },
    );
  }
}
