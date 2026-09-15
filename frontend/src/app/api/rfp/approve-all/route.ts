import { NextRequest, NextResponse } from "next/server";
import {
  approveTaskByApprover,
  getClickUpTask,
} from "@/lib/forms/clickup";
import { sendRequestorStatusNotification } from "@/lib/forms/email";
import { getTokenFromRequest } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

interface TaskApprovalItem {
  taskId: string;
  stageIndex?: number;
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "ClickUp authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { items, approverName, notes } = body as {
      items?: (string | TaskApprovalItem)[];
      approverName?: string;
      notes?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "No requests provided to approve" },
        { status: 400 }
      );
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const nameToUse = approverName || "Team Leader";

    const results: { taskId: string; success: boolean; error?: string }[] = [];

    for (const item of items) {
      const taskId = typeof item === "string" ? item : item.taskId;
      const stageIndex = typeof item === "string" ? 0 : Number(item.stageIndex ?? 0);

      if (!taskId) continue;

      try {
        const approved = await approveTaskByApprover(
          taskId,
          nameToUse,
          notes || "Auto-approved via Approver Review Portal",
          { token, stageIndex }
        );

        if (approved) {
          results.push({ taskId, success: true });

          // Attempt email dispatch asynchronously without failing the batch
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

            if (requestorEmail) {
              await sendRequestorStatusNotification({
                recipient: requestorEmail,
                event: "approved",
                department: "Finance",
                formType,
                values: {
                  requestor_first_name: requestorName.split(" ")[0],
                  form_name: formName,
                  form_id: formId,
                  department,
                  status_label: "Finance Verification",
                  request_title: task?.name || formName,
                  submitted_at: task?.date_created ? new Date(Number(task.date_created)).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : "",
                  status_updated_at: now,
                  completed_stage: "Approval Team Leader",
                  approver_name: nameToUse,
                  completed_at: now,
                  current_stage: "Finance Verification",
                  current_stage_started_at: now,
                  status_message: "Your request was approved by the Team Leader.",
                  next_step_message: "It is now with Finance for verification.",
                  track_status_url: `${appUrl}/?view=forms&tab=track`,
                },
              });
            }
          } catch (emailErr) {
            console.warn(`Could not dispatch email for task ${taskId}:`, emailErr);
          }
        } else {
          results.push({ taskId, success: false, error: "ClickUp update returned false" });
        }
      } catch (err: any) {
        results.push({ taskId, success: false, error: err?.message || "Unknown error" });
      }
    }

    const approvedCount = results.filter((r) => r.success).length;
    const failedCount = results.length - approvedCount;

    return NextResponse.json({
      success: approvedCount > 0,
      approvedCount,
      failedCount,
      total: results.length,
      results,
      message: `Successfully auto-approved ${approvedCount} of ${results.length} request(s)! Advanced to Finance Verification.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Error during auto-approval" },
      { status: 500 }
    );
  }
}
