import { NextRequest, NextResponse } from "next/server";
import { getClickUpTask } from "@/lib/forms/clickup";
import { getTokenFromRequest } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ success: false, message: "ClickUp authentication required" }, { status: 401 });
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json({ success: false, message: "Task ID is required" }, { status: 400 });
    }

    if (taskId.startsWith("MOCK-")) {
      return NextResponse.json({
        success: true,
        taskId,
        isMock: true,
        task: {
          id: taskId,
          name: "Sample RFP Revision",
          description: "Mock task revision data",
        },
      });
    }

    const task = await getClickUpTask(taskId, { token });

    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    }
    const user = getUserFromRequest(req);
    const userEmail = user?.email?.toLowerCase() || "";
    if (userEmail && userEmail !== "dave.policarpio@primephilippines.com") {
      const description = String(task.markdown_description || task.description || "").toLowerCase();
      if (!description.includes(userEmail)) return NextResponse.json({ success: false, message: "You do not have access to this request." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      taskId,
      isMock: false,
      task,
    });
  } catch (error: any) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch task from ClickUp" },
      { status: 500 }
    );
  }
}
