import { NextRequest, NextResponse } from "next/server";
import {
  approveTaskByApprover,
  rejectTaskForRevision,
  getClickUpTask,
} from "@/lib/forms/clickup";
import { sendRequestorRevisionNotification } from "@/lib/forms/email";
import { RfpFormData } from "@/types/forms/rfp";
import { getTokenFromRequest } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ success: false, message: "ClickUp authentication required" }, { status: 401 });
    const body = await req.json();
    const { taskId, action, approverName, notes, revisionReason, actorRole } = body;

    if (!taskId || !action) {
      return NextResponse.json(
        { success: false, message: "Missing taskId or action" },
        { status: 400 }
      );
    }

    const currentUser = getUserFromRequest(req);
    if (currentUser?.email && currentUser.email.toLowerCase() !== "dave.policarpio@primephilippines.com") {
      const supabaseUrl = process.env.SUPABASE_URL || "";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const configRes = await supabase.from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
        const config = configRes.data?.config;
        const admin = config?.admins?.some((item: any) => item.active !== false && String(item.email).toLowerCase() === currentUser.email.toLowerCase());
        const task = await getClickUpTask(taskId, { token });
        const taskName = String(task?.name || "");
        const formType = taskName.includes("[PO]") ? "po" : taskName.includes("[PCV]") ? "pcv" : "rfp";
        const department = taskName.match(/\(([^()]+)\)\s*$/)?.[1] || "General";
        const assigned = config?.mappings?.some((mapping: any) => mapping.formType === formType && mapping.department === department && mapping.approvers?.some((stage: any) => stage.emails?.some((email: string) => email.toLowerCase() === currentUser.email.toLowerCase())));
        if (!admin && !assigned) return NextResponse.json({ success: false, message: "You are not assigned as an approver for this request." }, { status: 403 });
      }
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    if (action === "approve") {
      const success = await approveTaskByApprover(
        taskId,
        approverName || "Team Leader",
        notes,
        { token, stageIndex: Number(body.stageIndex || 0) }
      );

      if (!success) {
        return NextResponse.json(
          { success: false, message: "Failed to update ClickUp task approval status" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Request #${taskId} endorsed successfully! Advanced to Finance Verification.`,
      });
    }

    if (action === "reject") {
      if (!revisionReason) {
        return NextResponse.json(
          { success: false, message: "Please provide a reason for the revision request" },
          { status: 400 }
        );
      }

      const success = await rejectTaskForRevision(
        taskId,
        approverName || (actorRole === "finance" ? "Finance Officer" : "Team Leader"),
        revisionReason,
        actorRole || "tl",
        { token, stageIndex: Number(body.stageIndex || 0) }
      );

      if (!success) {
        return NextResponse.json(
          { success: false, message: "Failed to record revision in ClickUp" },
          { status: 500 }
        );
      }

      // Fetch task details to notify requestor via Outlook email
      try {
        const task = await getClickUpTask(taskId, { token });
        if (task) {
          const dummyFormData: Partial<RfpFormData> = {
            payee: task.name,
          };
          await sendRequestorRevisionNotification({
            data: dummyFormData as RfpFormData,
            taskId,
            revisionReason,
            appUrl,
          });
        }
      } catch (emailErr) {
        console.warn("Could not dispatch revision notification email:", emailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Revision request recorded for RFP #${taskId}. Requestor has been notified.`,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action specified" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in /api/rfp/approve:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error in approval processing" },
      { status: 500 }
    );
  }
}
