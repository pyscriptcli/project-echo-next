import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { meeting_details, items, other_discussions, transcript } = await req.json();

    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
    const spaceId = meeting_details.space_id || meeting_details.spaceId;
    if (!spaceId) return NextResponse.json({ error: "Select a ClickUp Space before archiving this meeting." }, { status: 400 });
    const headers = { Authorization: token, "Content-Type": "application/json" };
    const listsRes = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/list`, { headers });
    if (!listsRes.ok) throw new Error("Unable to read ClickUp lists for this Space.");
    const lists = await listsRes.json();
    let list = (lists.lists || []).find((item: any) => item.name.toLowerCase() === "echo meetings");
    if (!list) {
      const createList = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/list`, { method: "POST", headers, body: JSON.stringify({ name: "Echo Meetings", content: "Echo meeting archive", due_date: null, priority: null, assignee: null, status: "to do" }) });
      if (!createList.ok) throw new Error("Unable to create Echo Meetings list in ClickUp.");
      list = await createList.json();
    }
    const description = [`# Meeting Minutes`, `Date: ${meeting_details.date || ""}`, `Department: ${meeting_details.department || meeting_details.workspace || "Unassigned"}`, `Location: ${meeting_details.location || ""}`, `\n## Summary\n${other_discussions || ""}`, `\n## Transcript\n${(transcript || "").substring(0, 20000)}`, `\n## Action Items\n${JSON.stringify(items || [], null, 2)}`].join("\n");
    const taskRes = await fetch(`https://api.clickup.com/api/v2/list/${list.id}/task`, { method: "POST", headers, body: JSON.stringify({ name: meeting_details.client_name || "Echo Meeting", description, assignees: [], tags: ["echo", "meeting-archive"] }) });
    if (!taskRes.ok) throw new Error("Unable to archive meeting in ClickUp.");
    const task = await taskRes.json();
    return NextResponse.json({ status: "success", message: "Meeting archived in ClickUp.", meeting_id: task.id, clickup: { workspace: meeting_details.workspace || "Current workspace", department: meeting_details.department || "Unassigned", listName: list.name, listId: list.id, taskId: task.id, taskUrl: task.url } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
