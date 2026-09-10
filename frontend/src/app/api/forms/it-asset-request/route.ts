import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { createFormRequestId } from "@/lib/forms/requestId";
import { sendSubmittedStatusEmail } from "@/lib/forms/email";

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
    const form = await req.formData();
    const listId = String(form.get("listId") || "");
    if (!listId) return NextResponse.json({ error: "IT Asset Request Form is not configured yet — please contact IT department." }, { status: 400 });
    const value = (name: string) => String(form.get(name) || "");
    const title = value("title");
    const formRequestId = await createFormRequestId({ token, listId, department: value("department") || "IT", formName: "IT Asset Request Form" });
    const description = [`# IT Asset Request`, `**Form ID:** ${formRequestId}`, `**Request title:** ${title}`, `**Employee:** ${value("employeeName")}`, `**Department:** ${value("department")}`, `**Asset type:** ${value("assetType")}`, `**Needed by:** ${value("neededBy")}`, `**Assignee:** ${value("assignee")}`, `**Team leader approval:** ${form.get("tlApproval") ? "Confirmed" : "Pending"}`, `\n## Reason for request\n${value("reason")}`, `\n## Remarks\n${value("remarks")}`, `\n---\nSubmitted by ${value("requestorName")} (${value("requestorEmail")})`].join("\n");
    const headers = { Authorization: token, "Content-Type": "application/json" };
    const taskRes = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, { method: "POST", headers, body: JSON.stringify({ name: `IT Asset Request — ${title}`, description, assignees: [] }) });
    if (!taskRes.ok) return NextResponse.json({ error: `ClickUp task creation failed: ${await taskRes.text()}` }, { status: taskRes.status });
    const task = await taskRes.json();
    for (const entry of form.getAll("attachments")) if (entry instanceof File && entry.size) { const upload = new FormData(); upload.append("attachment", entry, entry.name); await fetch(`https://api.clickup.com/api/v2/task/${task.id}/attachment`, { method: "POST", headers: { Authorization: token }, body: upload }); }
    const host = req.headers.get("host") || "localhost:3000";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")}://${host}`;
    try { await sendSubmittedStatusEmail({ recipient: value("requestorEmail"), requestorName: value("requestorName") || value("employeeName"), department: "IT", formType: "it-asset-request-form", formName: "IT Asset Request Form", formId: formRequestId, requestTitle: title, appUrl }); } catch (emailError) { console.warn("Could not send IT asset request confirmation:", emailError); }
    return NextResponse.json({ taskId: task.id, taskUrl: task.url, formRequestId });
  } catch (error: any) { return NextResponse.json({ error: error.message || "Unable to submit IT asset request." }, { status: 500 }); }
}
