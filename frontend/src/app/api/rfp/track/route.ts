import { NextRequest, NextResponse } from "next/server";
import { getListTasks, getClickUpTask } from "@/lib/forms/clickup";
import { getTokenFromRequest } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export interface TrackedRfp {
  taskId: string;
  taskName: string;
  taskUrl: string;
  formType: string;
  payee: string;
  department: string;
  totalAmount: number;
  dateNeeded: string;
  urgency: "urgent" | "normal";
  purpose: string;
  requestedBy: string;
  requestedByEmail?: string;
  currentStage:
    | "submitted"
    | "endorsed"
    | "finance_verification"
    | "disbursement_prep"
    | "executive_signoff"
    | "completed"
    | "revision_requested"
    | "ongoing"
    | string;
  stageLabel: string;
  stageIndex: number; // 0 to 5
  isRevisionRequested: boolean;
  revisionReason?: string;
  revisionBy?: "tl" | "finance" | "approver";
  dateCreated: string;
  updatedAt?: string;
  stageApprovedBy?: string;
  attachments: Array<{ id: string; name: string; url: string; type?: string }>;
}

function parseTaskToTrackedRfp(task: any): TrackedRfp {
  const statusStr = (task.status?.status || "").toLowerCase();
  const desc = task.markdown_description || task.description || "";

  // Identify form type
  let formType = "rfp";
  if (task.name.includes("[PO]") || desc.includes("Purchase Order (PO)")) {
    formType = "po";
  } else if (task.name.includes("[PCV]") || desc.includes("Petty Cash Voucher (PCV)")) {
    formType = "pcv";
  }

  // Extract payee/vendor, department, amount from task name or custom fields
  let payee = "";
  let department = "";
  let totalAmount = 0;
  let dateNeeded = "";
  let urgency: "urgent" | "normal" = task.priority?.priority === "urgent" ? "urgent" : "normal";
  let purpose = "";
  let requestedBy = "";
  let requestedByEmail = "";

  // Read from custom fields if available
  if (Array.isArray(task.custom_fields)) {
    task.custom_fields.forEach((cf: any) => {
      const name = (cf.name || "").toLowerCase();
      if (name.includes("payee") && cf.value) payee = String(cf.value);
      else if (name.includes("dept") && cf.value) department = String(cf.value);
      else if (name.includes("amount") && cf.value) totalAmount = Number(cf.value) || 0;
      else if (name.includes("purpose") && cf.value) purpose = String(cf.value);
      else if (name.includes("requestor") || name.includes("requestedby")) {
        if (typeof cf.value === "string") requestedBy = cf.value;
      }
    });
  }

  // Fallbacks from Task Name: [URGENT] [FORM] Entity — ₱Total (Dept)
  if (!payee || !department) {
    const nameMatch = task.name.match(/(?:\[(?:RFP|PO|PCV)[^\]]*\]\s*)(.+?)\s*—\s*₱?([\d,.]+)\s*(?:\((.+?)\))?/i);
    if (nameMatch) {
      if (!payee) payee = nameMatch[1].trim();
      if (!totalAmount) totalAmount = parseFloat(nameMatch[2].replace(/,/g, "")) || 0;
      if (!department && nameMatch[3]) department = nameMatch[3].trim();
    } else {
      payee = payee || task.name.replace(/^🚨?\s*\[.*?\]\s*/, "");
    }
  }

  // Parse details from Markdown Description table if missing
  if (!purpose) {
    const purposeMatch = desc.match(/\|\s*\*\*(?:Purpose|Notes|Particulars)\*\*\s*\|\s*(.+?)\s*\|/);
    if (purposeMatch) purpose = purposeMatch[1].replace(/_No purpose stated\._|_No additional notes\._/, "").trim();
  }
  if (!requestedBy) {
    const reqMatch = desc.match(/\|\s*\*\*(?:Requested By|Prepared By)\*\*\s*\|\s*\*\*?(.+?)\*\*?\s*(?:\(|$)/);
    if (reqMatch) requestedBy = reqMatch[1].trim();
  }

  // Custom department forms store their metadata in the task description.
  const descriptionDepartment = desc.match(/\*\*Department:\*\*\s*([^\n|]+)/i)?.[1]?.trim();
  if (!department && descriptionDepartment) department = descriptionDepartment;
  if (/IT Asset Request/i.test(task.name) || /# IT Asset Request/i.test(desc)) formType = "it-asset-request-form";
  else if (/IT Helpdesk/i.test(task.name) || /# Helpdesk Support Request/i.test(desc)) formType = "it-helpdesk-support-form";
  else if (/Bug Report/i.test(task.name) || /# Bug\/Error Report/i.test(desc)) formType = "it-bug-error-report-form";
  const requestedEmailMatch = desc.match(/\|\s*\*\*Requested By\*\*\s*\|\s*\*\*?[^|]+\(([^)@\s]+@[^)\s]+)\)/i) || desc.match(/\*\*Email:\*\*\s*([^\s|\n]+)/i);
  if (requestedEmailMatch) requestedByEmail = requestedEmailMatch[1].trim();
  if (!dateNeeded) {
    const dateMatch = desc.match(/\|\s*\*\*Date Needed\*\*\s*\|\s*\*\*?(.+?)\*\*?\s*(?:\(|$)/);
    if (dateMatch) dateNeeded = dateMatch[1].trim();
    else if (task.due_date) {
      dateNeeded = new Date(Number(task.due_date)).toISOString().split("T")[0];
    }
  }

  // 5-Stage Checklist Detection
  const isBox1Checked = /\[[xX]\]\s*(?:\*\*)?1\./.test(desc);
  const isBox2Checked = /\[[xX]\]\s*(?:\*\*)?2\./.test(desc);
  const isBox3Checked = /\[[xX]\]\s*(?:\*\*)?3\./.test(desc);
  const isBox4Checked = /\[[xX]\]\s*(?:\*\*)?4\./.test(desc);
  const isBox5Checked = /\[[xX]\]\s*(?:\*\*)?5\./.test(desc);

  const isDone =
    statusStr === "done" ||
    statusStr === "complete" ||
    statusStr === "completed" ||
    statusStr === "closed" ||
    statusStr === "resolved" ||
    task.status?.type === "closed" ||
    task.status?.type === "done";
  const isOngoing =
    statusStr === "on going" ||
    statusStr === "ongoing" ||
    statusStr === "in progress" ||
    statusStr === "in-progress" ||
    statusStr === "active" ||
    statusStr === "working" ||
    statusStr === "in review";

  let isRevisionRequested = false;
  let revisionReason = "";
  let revisionBy: "tl" | "finance" | "approver" = "approver";

  if (desc.includes("Revision Requested") || task.name.toLowerCase().includes("revision")) {
    isRevisionRequested = true;
    const revMatch = desc.match(/(?:\*\*)?Reason:(?:\*\*)?\s*([^\n\r]+)/i);
    if (revMatch) {
      revisionReason = revMatch[1].trim();
    }
    if (/Revision Requested by Finance/i.test(desc)) {
      revisionBy = "finance";
    } else {
      revisionBy = "tl";
    }
  }

  let currentStage: TrackedRfp["currentStage"] = "submitted";
  let stageLabel = "Submitted (Pending Endorsement)";
  let stageIndex = 0;

  if (isBox5Checked || isDone) {
    currentStage = "completed";
    stageLabel = "Payment Released & Completed";
    stageIndex = 5;
  } else if (isBox4Checked) {
    currentStage = "executive_signoff";
    stageLabel = "Executive Sign-Off (CFO & CEO)";
    stageIndex = 4;
  } else if (isBox3Checked) {
    currentStage = "disbursement_prep";
    stageLabel = "Disbursement Preparation (UB / Check)";
    stageIndex = 3;
  } else if (isBox2Checked) {
    currentStage = "finance_verification";
    stageLabel = "Finance Verification (Zoho & Top Sheet)";
    stageIndex = 2;
  } else if (isBox1Checked || isOngoing) {
    currentStage = "finance_verification";
    stageLabel = "Finance Verification";
    stageIndex = 2;
  } else {
    currentStage = "submitted";
    stageLabel = "Submitted (Pending Endorsement)";
    stageIndex = 0;
  }

  if (isRevisionRequested) {
    currentStage = "revision_requested";
    stageLabel =
      revisionBy === "finance"
        ? "Revision Requested by Finance"
        : "Revision Requested by Team Leader";
    if (revisionBy === "finance" && stageIndex < 2) {
      stageIndex = 2;
    }
  }

  // Finance approval progress is stored as an invisible Markdown marker so
  // requestors do not see a ClickUp checklist, while Echo can still render it.
  const stageMarker = desc.match(/<!--\s*echo-finance-stage:(\d+)(?:;at=([^;>]+))?(?:;by=([^>]+?))?\s*-->/i);
  let stageUpdatedAt = task.date_updated ? new Date(Number(task.date_updated)).toISOString() : undefined;
  let stageApprovedBy: string | undefined;
  if (stageMarker && ["rfp", "po", "pcv"].includes(formType)) {
    const savedStage = Number(stageMarker[1]);
    const clickUpStageIndex = stageIndex;
    // Earlier markers used 1 for a completed Team Leader approval.
    const savedStageIndex = Math.max(0, Math.min(5, savedStage === 1 ? 2 : savedStage));
    // Never let an older Echo marker move a task behind a later ClickUp status.
    stageIndex = Math.max(stageIndex, savedStageIndex);
    const financeStages = [
      ["submitted", "Submitted (Pending Endorsement)"],
      ["endorsed", "Approval Team Leader"],
      ["finance_verification", "Finance Verification"],
      ["disbursement_prep", "Disbursement Preparation"],
      ["executive_signoff", "Executive Sign-Off"],
      ["completed", "Payment Released & Completed"],
    ] as const;
    currentStage = financeStages[stageIndex][0];
    stageLabel = financeStages[stageIndex][1];
    try { if (stageMarker[2] && savedStageIndex >= clickUpStageIndex) stageUpdatedAt = decodeURIComponent(stageMarker[2]); } catch {}
    try { if (stageMarker[3]) stageApprovedBy = decodeURIComponent(stageMarker[3].trim()); } catch {}
  }

  // Non-finance forms strictly use a 3-status lifecycle: Submitted, On Going, Completed.
  if (!(["rfp", "po", "pcv"] as string[]).includes(formType)) {
    isRevisionRequested = false;
    revisionReason = "";
    if (isDone) {
      currentStage = "completed";
      stageLabel = "Completed";
      stageIndex = 2;
    } else if (isOngoing) {
      currentStage = "ongoing";
      stageLabel = "On Going";
      stageIndex = 1;
    } else {
      currentStage = "submitted";
      stageLabel = "Submitted";
      stageIndex = 0;
    }
  }

  // Attachments
  const attachments = Array.isArray(task.attachments)
    ? task.attachments.map((att: any) => ({
        id: att.id,
        name: att.name || "Attachment",
        url: att.url,
        type: att.mimetype || att.type,
      }))
    : [];

  return {
    taskId: task.id,
    taskName: task.name,
    taskUrl: task.url || `https://app.clickup.com/t/${task.id}`,
    formType,
    payee,
    department: department || "General",
    totalAmount,
    dateNeeded,
    urgency,
    purpose,
    requestedBy: requestedBy || "Team Member",
    requestedByEmail,
    currentStage,
    stageLabel,
    stageIndex,
    isRevisionRequested,
    revisionReason,
    dateCreated: task.date_created ? new Date(Number(task.date_created)).toISOString() : new Date().toISOString(),
    updatedAt: stageUpdatedAt,
    stageApprovedBy,
    attachments,
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ success: false, message: "ClickUp authentication required" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const query = (searchParams.get("query") || "").toLowerCase().trim();
    const dept = (searchParams.get("dept") || "").toLowerCase().trim();
    const email = (searchParams.get("email") || "").toLowerCase().trim();

    // 1. Direct ID lookup
    if (id) {
      const task = await getClickUpTask(id, { token });
      if (!task) {
        return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
      }
      const viewer = getUserFromRequest(req);
      const viewerEmail = viewer?.email?.toLowerCase() || "";
      if (viewerEmail && viewerEmail !== "dave.policarpio@primephilippines.com") {
        const description = String(task.markdown_description || task.description || "").toLowerCase();
        let assigned = false;
        const supabaseUrl = process.env.SUPABASE_URL || "";
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const configRes = await supabase.from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
          const taskName = String(task.name || "");
          const formType = taskName.includes("[PO]") ? "po" : taskName.includes("[PCV]") ? "pcv" : "rfp";
          const department = taskName.match(/\(([^()]+)\)\s*$/)?.[1] || "General";
          assigned = Boolean(configRes.data?.config?.mappings?.some((mapping: any) => mapping.formType === formType && mapping.department === department && mapping.approvers?.some((stage: any) => stage.emails?.some((email: string) => email.toLowerCase() === viewerEmail))));
        }
        if (!description.includes(viewerEmail) && !assigned) return NextResponse.json({ success: false, message: "You do not have access to this request." }, { status: 403 });
      }
      return NextResponse.json({
        success: true,
        requests: [parseTaskToTrackedRfp(task)],
      });
    }

    // 2. Fetch tasks from every form-specific list configured by the admin.
    // ClickUp remains the source of truth; Supabase only supplies the routing map.
    let config: any = null;
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const configRes = await supabase.from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
      config = configRes.data?.config || null;
    }
    const configuredListIds = Array.from(new Set(
      (config?.mappings || []).map((mapping: any) => String(mapping.listId || "").trim()).filter(Boolean)
    )) as string[];
    const listIds = configuredListIds.length ? configuredListIds : [undefined];
    const taskPages = await Promise.all(listIds.map((listId) => getListTasks(true, { token, listId })));
    const allTasks = Array.from(new Map(taskPages.flat().map((task: any) => [String(task.id), task])).values());
    let parsed = allTasks.map(parseTaskToTrackedRfp);

    // Apply filters
    if (query) {
      parsed = parsed.filter(
        (r) =>
          r.taskId.toLowerCase().includes(query) ||
          r.payee.toLowerCase().includes(query) ||
          r.department.toLowerCase().includes(query) ||
          r.purpose.toLowerCase().includes(query) ||
          r.requestedBy.toLowerCase().includes(query)
      );
    }

    if (dept && dept !== "all") {
      parsed = parsed.filter((r) => r.department.toLowerCase().includes(dept));
    }

    if (email) {
      parsed = parsed.filter((r) => {
        const emailPrefix = email.split("@")[0];
        return (
          r.requestedBy.toLowerCase().includes(emailPrefix) ||
          (r.requestedByEmail && r.requestedByEmail.toLowerCase().includes(email))
        );
      });
    }

    // Enforce Forms visibility: requestors see their own requests; configured approvers see
    // requests assigned to their current stage; admins and the Owner see everything.
    const user = getUserFromRequest(req);
    const userEmail = (user?.email || "").toLowerCase();
    const isAdmin = userEmail === "dave.policarpio@primephilippines.com" || Boolean(config?.admins?.some((admin: any) => admin.active !== false && String(admin.email).toLowerCase() === userEmail));
    if (!isAdmin && userEmail) {
      const prefix = userEmail.split("@")[0];
      parsed = parsed.filter((request) => {
        const isOwner = request.requestedByEmail?.toLowerCase() === userEmail || request.requestedBy.toLowerCase().includes(prefix);
        const mapping = config?.mappings?.find((item: any) => item.department === request.department && item.formType === request.formType);
        const stage = mapping?.approvers?.find((item: any) => Number(item.stage) === request.stageIndex);
        const isAssignedApprover = stage?.emails?.some((email: string) => email.toLowerCase() === userEmail);
        return Boolean(isOwner || isAssignedApprover);
      });
    }

    // Sort by creation date descending
    parsed.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

    return NextResponse.json({
      success: true,
      requests: parsed,
      count: parsed.length,
    });
  } catch (error: any) {
    console.error("Error in /api/rfp/track:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to retrieve tracking requests" },
      { status: 500 }
    );
  }
}
