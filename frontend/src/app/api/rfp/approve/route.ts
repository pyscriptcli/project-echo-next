import { NextRequest, NextResponse } from "next/server";
import {
  approveTaskByApprover,
  rejectTaskForRevision,
  getClickUpTask,
} from "@/lib/forms/clickup";
import { sendRequestorStatusNotification } from "@/lib/forms/email";
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

      try {
        const task = await getClickUpTask(taskId, { token });
        const description = String(task?.description || task?.markdown_description || "");
        const requestedByRow = description.match(/\|\s*\*\*Requested By\*\*\s*\|\s*\*\*([^*]+)\*\*\s*(?:\(([^)@]+@[^)]+)\))?/i);
        const requestorEmail = requestedByRow?.[2]?.trim()
          || description.match(/(?:Requested by email|Email):\*\*\s*([^\n]+)/i)?.[1]?.trim()
          || description.match(/Submitted by[^\n(]*\(([^)]+@[^)]+)\)/i)?.[1]?.trim();
        const requestorName = requestedByRow?.[1]?.trim() || description.match(/(?:Requested by|Employee):\*\*\s*([^\n]+)/i)?.[1]?.trim() || "Team Member";
        const formId = description.match(/\|\s*\*\*Form ID\*\*\s*\|\s*\*\*([^*]+)\*\*/i)?.[1]?.trim() || description.match(/\*\*Form ID:\*\*\s*([^\n]+)/i)?.[1]?.trim() || taskId;
        const department = description.match(/\*\*Department:\*\*\s*([^\n]+)/i)?.[1]?.trim() || "Finance";
        const formType = String(task?.name || "").includes("[PO]") ? "po" : String(task?.name || "").includes("[PCV]") ? "pcv" : "rfp";
        const formName = formType === "po" ? "Purchase Order" : formType === "pcv" ? "Petty Cash Voucher" : "Request for Payment";
        const now = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
        if (requestorEmail) await sendRequestorStatusNotification({
          recipient: requestorEmail,
          event: "approved",
          department: "Finance",
          formType,
          values: {
            requestor_first_name: requestorName.split(" ")[0], form_name: formName, form_id: formId,
            department, status_label: "Finance Verification", request_title: task?.name || formName,
            submitted_at: task?.date_created ? new Date(Number(task.date_created)).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : "",
            status_updated_at: now, completed_stage: "Approval Team Leader", approver_name: approverName || "Team Leader",
            completed_at: now, current_stage: "Finance Verification", current_stage_started_at: now,
            status_message: "Your request was approved by the Team Leader.", next_step_message: "It is now with Finance for verification.",
            track_status_url: `${appUrl}/?view=forms&tab=track`,
          },
        });
      } catch (emailErr) {
        console.warn("Could not dispatch approval status email:", emailErr);
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

      // Fetch task details to notify the actual requestor via the configured template.
      try {
        const task = await getClickUpTask(taskId, { token });
        if (task) {
          const description = String(task.description || task.markdown_description || "");
          const requestedByRow = description.match(/\|\s*\*\*Requested By\*\*\s*\|\s*\*\*([^*]+)\*\*\s*(?:\(([^)@]+@[^)]+)\))?/i);
          const requestorEmail = requestedByRow?.[2]?.trim();
          const requestorName = requestedByRow?.[1]?.trim() || "Team Member";
          const department = description.match(/\|\s*\*\*Department\*\*\s*\|\s*\*\*?([^|*\n]+)\*\*?/i)?.[1]?.trim() || "Finance";
          const formId = description.match(/\|\s*\*\*Form ID\*\*\s*\|\s*\*\*([^*]+)\*\*/i)?.[1]?.trim() || taskId;
          const taskName = String(task.name || "");
          const formType = taskName.includes("[PO]") ? "po" : taskName.includes("[PCV]") ? "pcv" : "rfp";
          const formName = formType === "po" ? "Purchase Order" : formType === "pcv" ? "Petty Cash Voucher" : "Request for Payment";
          const now = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
          if (requestorEmail) await sendRequestorStatusNotification({ recipient: requestorEmail, event: "revision_requested", department: "Finance", formType, values: {
            requestor_first_name: requestorName.split(" ")[0], form_name: formName, form_id: formId, department,
            status_label: "Revision Requested", request_title: taskName, status_updated_at: now,
            current_stage: "Revision Requested", current_stage_started_at: now,
            status_message: revisionReason, next_step_message: "Please update and resubmit your request.",
            track_status_url: `${appUrl}/?view=forms&tab=track`,
          } });
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
