import { NextRequest, NextResponse } from "next/server";

function getClickUpCredentials(req: NextRequest) {
  const token =
    req.headers.get("x-clickup-token") ||
    process.env.CLICKUP_API_TOKEN ||
    "";
  const listId =
    req.headers.get("x-clickup-list-id") ||
    process.env.CLICKUP_DEFAULT_LIST_ID ||
    "";
  return { token: token.trim(), listId: listId.trim() };
}

// Map ClickUp priority numbers (1: Urgent, 2: High, 3: Normal, 4: Low)
export function priorityToNumber(priority: string | number): number | null {
  if (typeof priority === "number") return priority;
  const p = priority?.toLowerCase() || "";
  if (p.includes("urgent")) return 1;
  if (p.includes("high")) return 2;
  if (p.includes("normal") || p.includes("medium")) return 3;
  if (p.includes("low")) return 4;
  return 3;
}

export function numberToPriority(num: number | null | undefined): string {
  switch (num) {
    case 1:
      return "urgent";
    case 2:
      return "high";
    case 3:
      return "normal";
    case 4:
      return "low";
    default:
      return "normal";
  }
}

// GET: Fetch tasks or discover lists
export async function GET(req: NextRequest) {
  try {
    const { token, listId } = getClickUpCredentials(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const targetListId = searchParams.get("listId") || listId;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "ClickUp API Token not configured. Please enter your API token in Configure Keys or set CLICKUP_API_TOKEN.",
          needsAuth: true,
        },
        { status: 401 }
      );
    }

    // Discovery action: fetch all accessible teams, spaces, and lists
    if (action === "discover") {
      const teamsRes = await fetch("https://api.clickup.com/api/v2/team", {
        headers: { Authorization: token },
      });
      if (!teamsRes.ok) {
        return NextResponse.json(
          { error: `ClickUp authentication failed: ${teamsRes.statusText}` },
          { status: teamsRes.status }
        );
      }
      const teamsData = await teamsRes.json();
      const discoveredLists: Array<{
        id: string;
        name: string;
        spaceName: string;
        teamName: string;
      }> = [];

      for (const team of teamsData.teams || []) {
        const spacesRes = await fetch(
          `https://api.clickup.com/api/v2/team/${team.id}/space`,
          { headers: { Authorization: token } }
        );
        if (!spacesRes.ok) continue;
        const spacesData = await spacesRes.json();

        for (const space of spacesData.spaces || []) {
          // Folderless lists
          const folderlessRes = await fetch(
            `https://api.clickup.com/api/v2/space/${space.id}/list`,
            { headers: { Authorization: token } }
          );
          if (folderlessRes.ok) {
            const folderlessData = await folderlessRes.json();
            for (const list of folderlessData.lists || []) {
              discoveredLists.push({
                id: list.id,
                name: list.name,
                spaceName: space.name,
                teamName: team.name,
              });
            }
          }

          // Folders and their lists
          const foldersRes = await fetch(
            `https://api.clickup.com/api/v2/space/${space.id}/folder`,
            { headers: { Authorization: token } }
          );
          if (foldersRes.ok) {
            const foldersData = await foldersRes.json();
            for (const folder of foldersData.folders || []) {
              for (const list of folder.lists || []) {
                discoveredLists.push({
                  id: list.id,
                  name: `${folder.name} / ${list.name}`,
                  spaceName: space.name,
                  teamName: team.name,
                });
              }
            }
          }
        }
      }

      return NextResponse.json({ lists: discoveredLists });
    }

    // Default action: Fetch tasks from targetListId
    if (!targetListId) {
      return NextResponse.json(
        {
          error:
            "ClickUp List ID not configured. Please select or enter your ClickUp List ID.",
          needsListId: true,
        },
        { status: 400 }
      );
    }

    const tasksRes = await fetch(
      `https://api.clickup.com/api/v2/list/${targetListId}/task?subtasks=true&include_closed=true`,
      {
        headers: { Authorization: token },
        cache: "no-store",
      }
    );

    if (!tasksRes.ok) {
      let errMsg = "Failed to fetch tasks from ClickUp";
      try {
        const errJson = await tasksRes.json();
        errMsg = errJson.err || errJson.error || errMsg;
      } catch (e) {}
      return NextResponse.json({ error: errMsg }, { status: tasksRes.status });
    }

    const tasksData = await tasksRes.json();
    const rawTasks = tasksData.tasks || [];

    // Map tasks to Project Echo standardized format
    const tasks = rawTasks.map((t: any) => {
      // Check for meeting tag
      const isMeetingTask = (t.tags || []).some(
        (tag: any) => tag.name?.toLowerCase() === "echo-meeting"
      );

      // Extract meeting title/context from description if present
      let meetingTitle = "";
      const desc = t.text_content || t.description || "";
      const match = desc.match(/🔗\s*Echo Meeting:\s*([^\n\r]+)/i);
      if (match && match[1]) {
        meetingTitle = match[1].trim();
      }

      return {
        id: t.id,
        name: t.name,
        description: desc,
        status: t.status?.status?.toLowerCase() || "to do",
        statusColor: t.status?.color || "#808080",
        priority: numberToPriority(t.priority?.id ? Number(t.priority.id) : null),
        priorityOrder: t.priority?.id || 3,
        dueDate: t.due_date ? new Date(Number(t.due_date)).toISOString() : null,
        startDate: t.start_date ? new Date(Number(t.start_date)).toISOString() : null,
        dateCreated: t.date_created ? new Date(Number(t.date_created)).toISOString() : null,
        url: t.url,
        assignees: (t.assignees || []).map((a: any) => ({
          id: a.id,
          username: a.username,
          email: a.email,
          initials: a.initials || a.username?.[0]?.toUpperCase() || "?",
          profilePicture: a.profilePicture || null,
        })),
        tags: (t.tags || []).map((tg: any) => tg.name),
        isMeetingTask,
        meetingTitle,
        listId: targetListId,
      };
    });

    return NextResponse.json({
      tasks,
      total: tasks.length,
      listId: targetListId,
    });
  } catch (error: any) {
    console.error("ClickUp Tasks GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error connecting to ClickUp" },
      { status: 500 }
    );
  }
}

// POST: Create a task in ClickUp
export async function POST(req: NextRequest) {
  try {
    const { token, listId } = getClickUpCredentials(req);
    const body = await req.json();
    const targetListId = body.listId || listId;

    if (!token) {
      return NextResponse.json(
        { error: "ClickUp API Token not configured." },
        { status: 401 }
      );
    }
    if (!targetListId) {
      return NextResponse.json(
        { error: "ClickUp List ID not configured." },
        { status: 400 }
      );
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Task name is required." },
        { status: 400 }
      );
    }

    // Prepare description with Project Echo meeting footprint
    let description = body.description || "";
    if (body.meetingTitle) {
      description += `\n\n---\n🔗 Echo Meeting: ${body.meetingTitle}`;
      if (body.meetingDate) {
        description += ` (${body.meetingDate})`;
      }
    }

    const payload: Record<string, any> = {
      name: body.name.trim(),
      description,
      tags: ["echo-meeting"],
      status: body.status || "to do",
      priority: priorityToNumber(body.priority || "normal"),
    };

    if (body.dueDate) {
      payload.due_date = new Date(body.dueDate).getTime();
      payload.due_date_time = false;
    }

    if (body.assignees && Array.isArray(body.assignees) && body.assignees.length > 0) {
      payload.assignees = body.assignees;
    }

    const createRes = await fetch(
      `https://api.clickup.com/api/v2/list/${targetListId}/task`,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!createRes.ok) {
      let errMsg = "Failed to create task in ClickUp";
      try {
        const errJson = await createRes.json();
        errMsg = errJson.err || errJson.error || errMsg;
      } catch (e) {}
      return NextResponse.json({ error: errMsg }, { status: createRes.status });
    }

    const createdTask = await createRes.json();
    return NextResponse.json({
      success: true,
      task: createdTask,
      url: createdTask.url,
      id: createdTask.id,
    });
  } catch (error: any) {
    console.error("ClickUp Tasks POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create task" },
      { status: 500 }
    );
  }
}

// PUT / PATCH: Update task status, priority, or due date
export async function PUT(req: NextRequest) {
  try {
    const { token } = getClickUpCredentials(req);
    const body = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "ClickUp API Token not configured." },
        { status: 401 }
      );
    }
    if (!body.taskId) {
      return NextResponse.json(
        { error: "Task ID is required for updates." },
        { status: 400 }
      );
    }

    const payload: Record<string, any> = {};
    if (body.status !== undefined) payload.status = body.status;
    if (body.name !== undefined) payload.name = body.name;
    if (body.description !== undefined) payload.description = body.description;
    if (body.priority !== undefined) {
      payload.priority = priorityToNumber(body.priority);
    }
    if (body.dueDate !== undefined) {
      payload.due_date = body.dueDate ? new Date(body.dueDate).getTime() : null;
    }

    const updateRes = await fetch(
      `https://api.clickup.com/api/v2/task/${body.taskId}`,
      {
        method: "PUT",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!updateRes.ok) {
      let errMsg = "Failed to update task in ClickUp";
      try {
        const errJson = await updateRes.json();
        errMsg = errJson.err || errJson.error || errMsg;
      } catch (e) {}
      return NextResponse.json({ error: errMsg }, { status: updateRes.status });
    }

    const updated = await updateRes.json();
    return NextResponse.json({ success: true, task: updated });
  } catch (error: any) {
    console.error("ClickUp Tasks PUT error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE: Delete or archive task
export async function DELETE(req: NextRequest) {
  try {
    const { token } = getClickUpCredentials(req);
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!token) {
      return NextResponse.json(
        { error: "ClickUp API Token not configured." },
        { status: 401 }
      );
    }
    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required." },
        { status: 400 }
      );
    }

    const delRes = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      method: "DELETE",
      headers: { Authorization: token },
    });

    if (!delRes.ok) {
      return NextResponse.json(
        { error: "Failed to delete task from ClickUp" },
        { status: delRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}
