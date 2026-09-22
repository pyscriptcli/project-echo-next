import { NextRequest, NextResponse } from "next/server";
import { getClickUpTask } from "@/lib/forms/clickup";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

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
        taskUrl: `https://app.clickup.com/t/${taskId}`,
        isMock: true,
        task: {
          id: taskId,
          name: "Sample RFP Revision",
          description: "Mock task revision data",
        },
        attachments: [],
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
      let authorized = description.includes(userEmail);
      if (!authorized) {
        const supabaseUrl = process.env.SUPABASE_URL || "";
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const configRes = await supabase.from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
          const taskName = String(task.name || "");
          const formType = taskName.includes("[PO]") ? "po" : taskName.includes("[PCV]") ? "pcv" : "rfp";
          const department = taskName.match(/\(([^()]+)\)\s*$/)?.[1] || "General";
          const isAdmin = Boolean(configRes.data?.config?.admins?.some((admin: any) => admin.active !== false && String(admin.email).toLowerCase() === userEmail));
          const isApprover = Boolean(configRes.data?.config?.mappings?.some((mapping: any) => mapping.formType === formType && mapping.department === department && mapping.approvers?.some((stage: any) => stage.emails?.some((email: string) => email.toLowerCase() === userEmail))));
          authorized = isAdmin || isApprover;
        }
      }
      if (!authorized) return NextResponse.json({ success: false, message: "You do not have access to this request." }, { status: 403 });
    }

    const attachments = Array.isArray(task.attachments)
      ? task.attachments.map((att: any) => ({
          id: att.id,
          name: att.title || att.name || "Attachment",
          url: att.url_w_query || att.url || "",
          type: att.mimetype || att.type || (att.extension ? `application/${att.extension}` : undefined),
          thumbnail: att.thumbnail_large || att.thumbnail_medium || att.thumbnail_small,
        }))
      : [];

    return NextResponse.json({
      success: true,
      taskId,
      taskUrl: task.url || `https://app.clickup.com/t/${taskId}`,
      isMock: false,
      task,
      attachments,
    });
  } catch (error: any) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch task from ClickUp" },
      { status: 500 }
    );
  }
}
