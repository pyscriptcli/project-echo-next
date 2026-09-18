import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { meeting_details, items, other_discussions, transcript } = await req.json();

    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
    const isConfidential = Boolean(meeting_details.is_confidential || meeting_details.isConfidential);
    const targetListId = meeting_details.list_id || meeting_details.meeting_list_id || meeting_details.meetingArchiveListId;
    const spaceId = meeting_details.space_id || meeting_details.spaceId;

    if (!targetListId && !spaceId) {
      return NextResponse.json({ error: "Select a ClickUp Space or List before archiving this meeting." }, { status: 400 });
    }

    const headers = { Authorization: token, "Content-Type": "application/json" };
    let list: any = null;
    let spaceName = meeting_details.space_name || "";

    if (targetListId) {
      const listRes = await fetch(`https://api.clickup.com/api/v2/list/${targetListId}`, { headers });
      if (listRes.ok) {
        list = await listRes.json();
        spaceName = list.space?.name || spaceName || "Personal List";
      } else if (!spaceId) {
        throw new Error("Specified ClickUp list could not be found or is inaccessible.");
      }
    }

    if (!list && spaceId) {
      const listsRes = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/list`, { headers });
      if (!listsRes.ok) throw new Error("Unable to read ClickUp lists for this Space.");
      const lists = await listsRes.json();
      const spaceRes = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}`, { headers }).catch(() => null);
      const spaceData = spaceRes?.ok ? await spaceRes.json().catch(() => ({})) : {};
      spaceName = spaceData.name || meeting_details.space_name || `Space ${spaceId}`;
      list = (lists.lists || []).find((item: any) => item.name.toLowerCase() === "echo meetings");
      if (!list) {
        const createList = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/list`, { method: "POST", headers, body: JSON.stringify({ name: "Echo Meetings", content: "Echo meeting archive" }) });
        if (!createList.ok) {
          const detail = await createList.text();
          throw new Error(`Unable to create Echo Meetings list in ClickUp (${createList.status}): ${detail || createList.statusText}`);
        }
        list = await createList.json();
      }
    }
    const teamAtt = meeting_details.prime_attendees || meeting_details.team_attendees || (Array.isArray(meeting_details.attendees_prime) ? meeting_details.attendees_prime.join(", ") : "");
    const extAtt = meeting_details.external_attendees || (Array.isArray(meeting_details.attendees_external) ? meeting_details.attendees_external.join(", ") : "");
    const description = [
      `# Meeting Details`,
      `**Date:** ${meeting_details.date || ""}`,
      `**Start:** ${meeting_details.start_time || ""}`,
      `**End:** ${meeting_details.end_time || ""}`,
      `**Owner:** ${meeting_details.prepared_by || meeting_details.owner || "Unassigned"}`,
      `**Department:** ${meeting_details.department || meeting_details.workspace || "Unassigned"}`,
      `**Location:** ${meeting_details.location || ""}`,
      ...(teamAtt ? [`**Team Attendees:** ${teamAtt}`] : []),
      ...(extAtt ? [`**External Attendees:** ${extAtt}`] : []),
      `\n# Executive Summary\n${other_discussions || ""}`,
      `\n# Discussion Points\n${JSON.stringify(items || [], null, 2)}`,
      `\n# Full Transcript\n${(transcript || "").substring(0, 20000)}`
    ].join("\n");
    const meetingDate = meeting_details.date || new Date().toISOString().slice(0, 10);
    const meetingName = meeting_details.client_name || "Echo Meeting";
    // Detect available statuses for this list to match the workspace workflow
    let availableStatuses: { status: string; type?: string }[] = Array.isArray(list.statuses) ? list.statuses : [];
    if (!availableStatuses.length) {
      const listDetailRes = await fetch(`https://api.clickup.com/api/v2/list/${list.id}`, { headers }).catch(() => null);
      if (listDetailRes?.ok) {
        const listDetail = await listDetailRes.json().catch(() => ({}));
        if (Array.isArray(listDetail.statuses)) {
          availableStatuses = listDetail.statuses;
        }
      }
    }

    // Find the best matching status:
    // 1. "completed ontime" if configured in the workspace
    // 2. Any closed/done status
    // 3. Any status with "complete", "closed", or "done"
    // 4. Default to standard "closed" or "complete"
    const hasCompletedOntime = availableStatuses.some(
      (s) => s.status?.toLowerCase() === "completed ontime" || /completed\s*ontime/i.test(s.status || "")
    );
    const closedStatus = availableStatuses.find(
      (s) => s.type?.toLowerCase() === "closed" || s.type?.toLowerCase() === "done"
    )?.status;
    const generalCompleteStatus = availableStatuses.find(
      (s) => /(complete|closed|done)/i.test(s.status || "")
    )?.status;

    const preferredStatus = hasCompletedOntime
      ? "completed ontime"
      : closedStatus || generalCompleteStatus || (availableStatuses[availableStatuses.length - 1]?.status);

    const tags = isConfidential
      ? ["echo", "confidential", "meeting-archive"]
      : ["echo", "meeting-archive"];

    const basePayload = {
      name: `${meetingDate} — ${meetingName}`,
      description,
      assignees: [],
      tags,
    };

    // Attempt creation with preferred status, then fallback to closed, then fallback without status
    let taskRes: Response | null = null;
    let appliedStatus = preferredStatus || "closed";

    if (preferredStatus) {
      taskRes = await fetch(`https://api.clickup.com/api/v2/list/${list.id}/task`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...basePayload, status: preferredStatus }),
      });
    }

    // Fallback attempt 1: if preferredStatus failed and was different from closedStatus
    if ((!taskRes || !taskRes.ok) && closedStatus && closedStatus !== preferredStatus) {
      taskRes = await fetch(`https://api.clickup.com/api/v2/list/${list.id}/task`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...basePayload, status: closedStatus }),
      });
      if (taskRes.ok) appliedStatus = closedStatus;
    }

    // Fallback attempt 2: standard "closed" or "complete"
    if (!taskRes || !taskRes.ok) {
      for (const fallback of ["complete", "closed"]) {
        if (fallback === preferredStatus || fallback === closedStatus) continue;
        const fbRes = await fetch(`https://api.clickup.com/api/v2/list/${list.id}/task`, {
          method: "POST",
          headers,
          body: JSON.stringify({ ...basePayload, status: fallback }),
        });
        if (fbRes.ok) {
          taskRes = fbRes;
          appliedStatus = fallback;
          break;
        }
      }
    }

    // Fallback attempt 3: create without status (ClickUp will assign default open status)
    if (!taskRes || !taskRes.ok) {
      taskRes = await fetch(`https://api.clickup.com/api/v2/list/${list.id}/task`, {
        method: "POST",
        headers,
        body: JSON.stringify(basePayload),
      });
      if (taskRes.ok) {
        appliedStatus = "default";
      }
    }

    if (!taskRes || !taskRes.ok) {
      const detail = taskRes ? await taskRes.text() : "Network error";
      throw new Error(`Unable to archive meeting in ClickUp (${taskRes?.status || 500}): ${detail || taskRes?.statusText}`);
    }

    const task = await taskRes.json();
    const finalStatus = task.status?.status || appliedStatus;

    return NextResponse.json({
      status: "success",
      message: isConfidential ? "Confidential meeting archived in ClickUp." : "Meeting archived in ClickUp.",
      meeting_id: task.id,
      clickup: {
        workspace: meeting_details.workspace || "Current workspace",
        department: isConfidential ? "Confidential" : (meeting_details.department || "Unassigned"),
        spaceId: String(spaceId || list?.space?.id || ""),
        spaceName,
        listName: list.name,
        listId: list.id,
        taskId: task.id,
        taskUrl: task.url,
        archiveStatus: finalStatus,
        isConfidential,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
