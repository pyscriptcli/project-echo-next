import { NextRequest, NextResponse } from "next/server";
import { RfpFormData, FormType } from "@/types/forms/rfp";
import {
  createClickUpTask,
  updateClickUpTask,
  uploadAttachmentToTask,
} from "@/lib/forms/clickup";
import { sendApproverNotification } from "@/lib/forms/email";
import { getTokenFromRequest } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ success: false, message: "ClickUp authentication required" }, { status: 401 });
    const formData = await req.formData();
    const dataStr = formData.get("data") as string;
    const formType = ((formData.get("formType") as string) || "rfp") as FormType;
    const mappedListId = formData.get("listId")?.toString();

    if (!dataStr) {
      return NextResponse.json(
        { success: false, message: "Missing form data payload" },
        { status: 400 }
      );
    }

    const data: any = JSON.parse(dataStr);
    data.__clickupToken = token;
    if (mappedListId) data.__clickupListId = mappedListId;
    const sessionUser = getUserFromRequest(req);
    if (sessionUser?.email) {
      data.requestedByName = sessionUser.username || data.requestedByName;
      data.requestedByEmail = sessionUser.email;
      const supabaseUrl = process.env.SUPABASE_URL || "";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
      if (supabaseUrl && supabaseKey && sessionUser.email.toLowerCase() !== "dave.policarpio@primephilippines.com") {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const configRes = await supabase.from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
        const config = configRes.data?.config;
        const member = config?.members?.find((item: any) => item.active !== false && String(item.email).toLowerCase() === sessionUser.email.toLowerCase());
        const admin = config?.admins?.some((item: any) => item.active !== false && String(item.email).toLowerCase() === sessionUser.email.toLowerCase());
        if (!admin && (!member || (member.department && member.department !== data.department))) return NextResponse.json({ success: false, message: "You can only submit forms for your assigned department." }, { status: 403 });
      }
    }

    // Determine application base URL
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    let taskResult;
    const isRevision = Boolean(data.taskId);

    if (isRevision && data.taskId) {
      taskResult = await updateClickUpTask(data.taskId, data, appUrl, formType);
    } else {
      taskResult = await createClickUpTask(data, appUrl, formType);
    }

    const taskId = taskResult.id;

    if (taskId) {
      const typeLabel = formType.toUpperCase();
      const entityName = formType === "po" ? (data.vendorName || "Vendor") : (data.payee || "Payee");
      const sanitizedName = entityName.replace(/[^a-zA-Z0-9_-]/g, "_");

      // 1. Upload high-res visual preview image of the form (appears in ClickUp right sidebar)
      const previewImageBlob = formData.get("previewImage") as File | null;
      if (previewImageBlob) {
        const previewFilename = `${typeLabel}_${sanitizedName}_Preview.png`;
        await uploadAttachmentToTask(taskId, previewImageBlob, previewFilename, { token });
      }

      // 2. Upload official generated PDF document
      const pdfBlob = formData.get("pdf") as File | null;
      if (pdfBlob) {
        const pdfFilename = `${typeLabel}_${sanitizedName}_${data.date || "document"}.pdf`;
        await uploadAttachmentToTask(taskId, pdfBlob, pdfFilename, { token });
      }

      // 3. Upload all supporting documents
      const supportingFiles = formData.getAll("supportingFiles") as File[];
      if (supportingFiles && supportingFiles.length > 0) {
        for (const file of supportingFiles) {
          if (file && file.size > 0) {
            await uploadAttachmentToTask(taskId, file, file.name, { token });
          }
        }
      }

      // 4. Dispatch Outlook email notification to Approver if applicable
      if (formType === "rfp" && (data.approverEmail || data.approverName || data.approvedByName)) {
        try {
          await sendApproverNotification({
            approverEmail: data.approverEmail,
            approverName: data.approverName || data.approvedByName,
            data,
            taskId,
            appUrl,
          });
        } catch (emailErr) {
          console.warn("Could not dispatch approver notification email:", emailErr);
        }
      }
    }

    const docName = formType === "po" ? "Purchase Order (PO)" : formType === "pcv" ? "Petty Cash Voucher (PCV)" : "Request for Payment (RFP)";

    return NextResponse.json({
      success: true,
      taskId: taskResult.id,
      taskUrl: taskResult.url,
      isMock: taskResult.isMock || false,
      message: isRevision
        ? `${docName} revised and updated in ClickUp successfully!`
        : `${docName} submitted and created in ClickUp successfully!`,
      taskData: taskResult,
    });
  } catch (error: any) {
    console.error("Error in /api/rfp/submit:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal server error submitting RFP to ClickUp",
      },
      { status: 500 }
    );
  }
}
