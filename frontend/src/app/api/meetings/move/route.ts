import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, getWorkspaceApiToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req) || getWorkspaceApiToken();
    if (!token) {
      return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const {
      meetingId,
      destinationListId,
      sourceListId,
      isConfidential,
      destinationSpaceId,
      destinationSpaceName,
      destinationListName,
    } = body;

    if (!meetingId || !destinationListId) {
      return NextResponse.json(
        { error: "meetingId and destinationListId are required." },
        { status: 400 }
      );
    }

    const headers = {
      Authorization: token,
      "Content-Type": "application/json",
    };

    // 1. Fetch current task details to get team_id and current home list
    const taskRes = await fetch(`https://api.clickup.com/api/v2/task/${meetingId}`, {
      headers,
      cache: "no-store",
    });

    if (!taskRes.ok) {
      const errText = await taskRes.text().catch(() => "");
      return NextResponse.json(
        { error: `ClickUp task not found or inaccessible (${taskRes.status}): ${errText}` },
        { status: taskRes.status }
      );
    }

    const taskData = await taskRes.json();
    const teamId = taskData.team_id;
    const currentListId = sourceListId || taskData.list?.id;

    // 2. Relocate task: Try ClickUp API v3 home_list first
    let moveSuccess = false;

    if (teamId) {
      try {
        const v3Res = await fetch(
          `https://api.clickup.com/api/v3/workspaces/${teamId}/tasks/${meetingId}/home_list/${destinationListId}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({ move_custom_fields: true }),
          }
        );
        if (v3Res.ok) {
          moveSuccess = true;
        }
      } catch (v3Err) {
        console.warn("[MoveMeeting] ClickUp v3 home_list failed, falling back to v2:", v3Err);
      }
    }

    // Fallback: ClickUp API v2 Add to List + Remove from Old List
    if (!moveSuccess) {
      const addRes = await fetch(
        `https://api.clickup.com/api/v2/list/${destinationListId}/task/${meetingId}`,
        {
          method: "POST",
          headers,
        }
      );

      if (!addRes.ok && addRes.status !== 400) {
        const errText = await addRes.text().catch(() => "");
        return NextResponse.json(
          { error: `Failed to add task to destination list (${addRes.status}): ${errText}` },
          { status: addRes.status }
        );
      }

      if (currentListId && String(currentListId) !== String(destinationListId)) {
        await fetch(
          `https://api.clickup.com/api/v2/list/${currentListId}/task/${meetingId}`,
          {
            method: "DELETE",
            headers,
          }
        ).catch(() => null);
      }
      moveSuccess = true;
    }

    // 3. Update confidentiality tag
    try {
      if (isConfidential) {
        await fetch(`https://api.clickup.com/api/v2/task/${meetingId}/tag/private`, {
          method: "POST",
          headers,
        }).catch(() => null);
      } else {
        await fetch(`https://api.clickup.com/api/v2/task/${meetingId}/tag/private`, {
          method: "DELETE",
          headers,
        }).catch(() => null);
      }
    } catch (tagErr) {
      console.warn("[MoveMeeting] Tag update failed:", tagErr);
    }

    // 4. Post audit comment
    const auditComment = isConfidential
      ? `Echo archive relocated to Personal/Private List: ${destinationListName || "Personal List"}.`
      : `Echo archive relocated to ${destinationSpaceName || "Space"} › ${destinationListName || "List"}.`;

    await fetch(`https://api.clickup.com/api/v2/task/${meetingId}/comment`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        comment_text: auditComment,
        notify_all: false,
      }),
    }).catch(() => null);

    return NextResponse.json({
      status: "success",
      message: "Meeting archive relocated successfully.",
      meeting: {
        id: meetingId,
        clickup_list_id: String(destinationListId),
        clickup_list_name: destinationListName || (isConfidential ? "Personal List" : "Echo Meetings"),
        clickup_space_id: destinationSpaceId || (isConfidential ? "__personal__" : ""),
        clickup_space_name: destinationSpaceName || (isConfidential ? "Personal List" : "Workspace"),
        is_confidential: Boolean(isConfidential),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to move meeting archive." },
      { status: 500 }
    );
  }
}
