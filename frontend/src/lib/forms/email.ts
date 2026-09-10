import nodemailer from "nodemailer";
import { RfpFormData } from "@/types/forms/rfp";
import { createClient } from "@supabase/supabase-js";

export interface EmailConfig {
  user: string;
  pass: string;
  host: string;
  port: number;
  fromName: string;
  resendKey: string;
  fromAddress: string;
  provider: "resend" | "smtp";
  isConfigured: boolean;
}

export function getEmailConfig(): EmailConfig {
  const user = process.env.BREVO_SMTP_USER || process.env.SMTP_USER || process.env.OUTLOOK_EMAIL_USER || "";
  const pass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS || process.env.OUTLOOK_EMAIL_PASS || "";
  const host = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || process.env.OUTLOOK_SMTP_HOST || "smtp-relay.brevo.com";
  const port = parseInt(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || process.env.OUTLOOK_SMTP_PORT || "587", 10);
  const fromName = process.env.EMAIL_FROM_NAME || "Forms Portal";
  const resendKey = process.env.RESEND_API_KEY || "";
  const fromAddress = process.env.EMAIL_FROM || user;
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase() === "resend" || (!process.env.EMAIL_PROVIDER && resendKey) ? "resend" : "smtp";

  const smtpConfigured = Boolean(user && pass && user !== "mock" && !user.includes("example.com"));
  const isConfigured = provider === "resend" ? Boolean(resendKey && fromAddress) : smtpConfigured;
  return { user, pass, host, port, fromName, resendKey, fromAddress, provider, isConfigured };
}

function createTransporter() {
  const config = getEmailConfig();
  if (!config.user || !config.pass) return null;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });
}

type StatusEmailEvent = "submitted" | "approved" | "revision_requested" | "completed";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
}

function renderTemplate(template: string, values: Record<string, unknown>) {
  return template.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (_, key) => String(values[key] ?? ""));
}

async function loadStatusTemplate(department: string, formType: string, event: StatusEmailEvent) {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data } = await supabase.from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
  return data?.config?.emailTemplates?.find((item: any) => item.department === department && item.formType === formType && item.event === event) || null;
}

export async function sendRequestorStatusNotification({
  recipient,
  event,
  department,
  formType,
  values,
}: {
  recipient: string;
  event: StatusEmailEvent;
  department: string;
  formType: string;
  values: Record<string, unknown>;
}) {
  if (!recipient) return { success: false, error: "Requestor email unavailable" };
  const configured = await loadStatusTemplate(department, formType, event);
  if (configured?.enabled === false) return { success: true, skipped: true };
  const defaults = {
    subject: "Request Status Update ({{form_id}})",
    body: "Hi {{requestor_first_name}},\n\nYour {{form_name}} request has been updated.\n\nRequest ID: {{form_id}}\nSubmitted: {{submitted_at}}\nLast updated: {{status_updated_at}}\nStatus: {{status_label}}\nDepartment: {{department}}\nRequest title: {{request_title}}\nAmount: {{amount}}\nPurpose: {{purpose}}\n\nCompleted stage: {{completed_stage}}\nApproved by: {{approver_name}}\nCompleted: {{completed_at}}\n\nCurrent stage: {{current_stage}}\nStarted: {{current_stage_started_at}}\n\n{{status_message}}\n{{next_step_message}}\n\nTrack request: {{track_status_url}}",
  };
  const safeValues = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, escapeHtml(value)]));
  const subject = renderTemplate(configured?.subject || defaults.subject, values);
  const body = renderTemplate(configured?.body || defaults.body, safeValues);
  const html = `<div style="background:#f4f4f6;padding:28px;font-family:Arial,sans-serif;color:#334155"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e2e8f0"><div style="background:#3f3f3f;color:#fff;padding:22px 30px;font-size:20px;font-weight:700">Request Status Update</div><div style="padding:30px;line-height:1.55;font-size:14px;white-space:normal">${body.replace(/\n/g, "<br>")}</div></div></div>`;
  const config = getEmailConfig();
  if (!config.isConfigured) {
    console.warn("[Email] Requestor notification not sent: configure Brevo SMTP (BREVO_SMTP_USER/BREVO_SMTP_KEY) or Resend (RESEND_API_KEY/EMAIL_FROM) in Vercel.");
    return { success: false, error: "Email delivery is not configured" };
  }
  // Resend is the primary provider whenever its API key is present. This is
  // intentional even when stale SMTP variables remain in the deployment.
  if (config.provider === "resend" && config.resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${config.resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: config.fromAddress, to: [recipient], subject, html }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = result?.message || result?.name || `HTTP ${response.status}`;
        console.error(`[Email Error] Resend rejected requestor notification: ${detail}`);
        return { success: false, error: `Resend delivery failed: ${detail}` };
      }
      console.info(`[Email] Resend requestor notification accepted: ${result.id || "no-message-id"}`);
      return { success: true, messageId: result.id };
    } catch (error: any) {
      console.error("[Email Error] Resend requestor notification failed:", error);
      return { success: false, error: error.message };
    }
  }
  const transporter = createTransporter();
  if (!transporter) return { success: false, error: "Transporter unavailable" };
  try {
    const info = await transporter.sendMail({ from: `"${config.fromName}" <${config.user}>`, to: recipient, subject, html });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[Email Error] Failed to send requestor status email:", error);
    return { success: false, error: error.message };
  }
}

export async function sendSubmittedStatusEmail({
  recipient,
  requestorName,
  department,
  formType,
  formName,
  formId,
  requestTitle,
  appUrl,
}: {
  recipient: string;
  requestorName: string;
  department: string;
  formType: string;
  formName: string;
  formId: string;
  requestTitle: string;
  appUrl: string;
}) {
  const now = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  return sendRequestorStatusNotification({
    recipient,
    event: "submitted",
    department,
    formType,
    values: {
      requestor_first_name: (requestorName || "Team Member").split(" ")[0],
      form_name: formName,
      form_id: formId,
      department,
      status_label: "Submitted",
      request_title: requestTitle,
      submitted_at: now,
      status_updated_at: now,
      current_stage: "Submitted",
      current_stage_started_at: now,
      status_message: "Your request was received and is now in the queue.",
      next_step_message: "",
      track_status_url: `${appUrl}/?view=forms&tab=track`,
    },
  });
}

/**
 * Sends an Outlook notification email to the Team Leader / Approver.
 */
export async function sendApproverNotification({
  approverEmail,
  approverName,
  data,
  taskId,
  appUrl,
}: {
  approverEmail?: string;
  approverName?: string;
  data: RfpFormData;
  taskId: string;
  appUrl: string;
}) {
  const config = getEmailConfig();
  const recipient = approverEmail || data.approverEmail || "approvals@primephilippines.com";
  const recipientName = approverName || data.approverName || data.approvedByName || "Approver";
  const approvalUrl = `${appUrl}/?view=forms&tab=approvals&taskId=${taskId}`;
  const formattedTotal = Number(data.totalAmount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const subject = `[ACTION REQUIRED] Request Approval: ${data.payee} — ₱${formattedTotal} (${data.department || "General"})`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-top: 4px solid #003366;">
      <div style="margin-bottom: 20px;">
        <h2 style="color: #003366; margin: 0; font-size: 20px;">Forms Portal</h2>
        <p style="color: #64748b; margin: 2px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Form Approval Required</p>
      </div>

      <p style="font-size: 14px; color: #334155;">Hello <strong>${recipientName}</strong>,</p>
      <p style="font-size: 14px; color: #334155;">A new request has been submitted by <strong>${data.requestedByName || "a team member"}</strong> and requires your review and approval:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: bold; color: #475569; width: 35%; background: #f8fafc;">Total Payable</td>
          <td style="padding: 8px 12px; font-weight: bold; color: #003366; font-size: 16px;">₱${formattedTotal}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: bold; color: #475569; background: #f8fafc;">Payee</td>
          <td style="padding: 8px 12px; color: #1e293b;">${data.payee || "N/A"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: bold; color: #475569; background: #f8fafc;">Department</td>
          <td style="padding: 8px 12px; color: #1e293b;">${data.department || "N/A"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: bold; color: #475569; background: #f8fafc;">Date Needed</td>
          <td style="padding: 8px 12px; color: #1e293b;">${data.dateNeeded || "N/A"} ${data.urgency === "urgent" ? '<span style="color: #dc2626; font-weight: bold;">(URGENT)</span>' : ""}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: bold; color: #475569; background: #f8fafc;">Purpose</td>
          <td style="padding: 8px 12px; color: #1e293b;">${data.purpose || "N/A"}</td>
        </tr>
      </table>

      <div style="margin: 30px 0; text-align: center;">
        <a href="${approvalUrl}" style="background-color: #003366; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; border-radius: 4px;">
          Review & Approve in Forms Portal
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
        Sign in through Echo with your ClickUp account to approve or request revisions through the secure portal link above.<br/>
        Task ID: #${taskId}
      </p>
    </div>
  `;

  if (!config.isConfigured) {
    console.log(`[Email Mock] Approver notification simulated to ${recipient}:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Approval URL: ${approvalUrl}`);
    return { success: true, isMock: true };
  }

  try {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: "Transporter unavailable" };

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.user}>`,
      to: recipient,
      subject,
      html,
    });

    console.log(`[Email] Approver notification sent to ${recipient}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, isMock: false };
  } catch (error: any) {
    console.error("[Email Error] Failed to send approver email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends an Outlook notification email to the Requestor when revision is requested.
 */
export async function sendRequestorRevisionNotification({
  requestorEmail,
  requestorName,
  data,
  taskId,
  revisionReason,
  appUrl,
}: {
  requestorEmail?: string;
  requestorName?: string;
  data: RfpFormData;
  taskId: string;
  revisionReason: string;
  appUrl: string;
}) {
  const config = getEmailConfig();
  const recipient = requestorEmail || data.requestedByEmail || "requestor@primephilippines.com";
  const recipientName = requestorName || data.requestedByName || "Requestor";
  const editUrl = `${appUrl}/?view=forms&tab=create&taskId=${taskId}`;
  const trackUrl = `${appUrl}/?view=forms&tab=track&id=${taskId}`;

  const subject = `[REVISION REQUESTED] Request #${taskId}: ${data.payee} — Action Required`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-top: 4px solid #f59e0b;">
      <div style="margin-bottom: 20px;">
        <h2 style="color: #003366; margin: 0; font-size: 20px;">Forms Portal</h2>
        <p style="color: #b45309; margin: 2px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Revision Requested on Your Submission</p>
      </div>

      <p style="font-size: 14px; color: #334155;">Hello <strong>${recipientName}</strong>,</p>
      <p style="font-size: 14px; color: #334155;">Your request for <strong>${data.payee}</strong> requires updates before it can be approved.</p>

      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; color: #92400e; text-transform: uppercase;">Approver's Revision Notes:</p>
        <p style="margin: 0; font-size: 14px; color: #78350f; font-style: italic;">"${revisionReason}"</p>
      </div>

      <div style="margin: 30px 0; text-align: center;">
        <a href="${editUrl}" style="background-color: #003366; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; border-radius: 4px;">
          ✏️ Edit & Resubmit Form
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center;">
        You can also track this request's live status at: <a href="${trackUrl}" style="color: #003366;">${trackUrl}</a>
      </p>
    </div>
  `;

  if (!config.isConfigured) {
    console.log(`[Email Mock] Requestor revision notification simulated to ${recipient}:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Reason: ${revisionReason}`);
    console.log(`  Edit URL: ${editUrl}`);
    return { success: true, isMock: true };
  }

  try {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: "Transporter unavailable" };

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.user}>`,
      to: recipient,
      subject,
      html,
    });

    console.log(`[Email] Revision email sent to ${recipient}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, isMock: false };
  } catch (error: any) {
    console.error("[Email Error] Failed to send revision email:", error);
    return { success: false, error: error.message };
  }
}
