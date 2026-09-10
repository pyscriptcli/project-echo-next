import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { createFormRequestId } from "@/lib/forms/requestId";
import { sendSubmittedStatusEmail } from "@/lib/forms/email";

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req); if (!token) return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
    const form = await req.formData(); const listId = String(form.get("listId") || "");
    if (!listId) return NextResponse.json({ error: "Helpdesk Support Form is not configured yet — please contact IT department." }, { status: 400 });
    const value = (name: string) => String(form.get(name) || "");
    const formRequestId = await createFormRequestId({ token, listId, department: value("department") || "IT", formName: "Helpdesk Support Form" });
    const description = [`# Helpdesk Support Request`, `**Form ID:** ${formRequestId}`, `**Email:** ${value("email")}`, `**Department:** ${value("department")}`, `**Request type:** ${value("jobRequestType")}`, `\n## IT concern\n${value("details")}`, `\n## Remarks\n${value("remarks") || "—"}`, `\n---\nSubmitted by ${value("requestorName")}`].join("\n");
    const taskRes = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, { method: "POST", headers: { Authorization: token, "Content-Type": "application/json" }, body: JSON.stringify({ name: `IT Helpdesk — ${value("subject")}`, description, assignees: [] }) });
    if (!taskRes.ok) return NextResponse.json({ error: `ClickUp task creation failed: ${await taskRes.text()}` }, { status: taskRes.status });
    const task = await taskRes.json();
    for (const entry of form.getAll("attachments")) if (entry instanceof File && entry.size) { const upload = new FormData(); upload.append("attachment", entry, entry.name); await fetch(`https://api.clickup.com/api/v2/task/${task.id}/attachment`, { method: "POST", headers: { Authorization: token }, body: upload }); }
    const host = req.headers.get("host") || "localhost:3000";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")}://${host}`;
    try { await sendSubmittedStatusEmail({ recipient: value("email"), requestorName: value("requestorName"), department: "IT", formType: "it-helpdesk-support-form", formName: "Helpdesk Support Form", formId: formRequestId, requestTitle: value("subject"), appUrl }); } catch (emailError) { console.warn("Could not send helpdesk confirmation:", emailError); }
    return NextResponse.json({ taskId: task.id, taskUrl: task.url, formRequestId });
  } catch (error: any) { return NextResponse.json({ error: error.message || "Unable to submit helpdesk request." }, { status: 500 }); }
}
