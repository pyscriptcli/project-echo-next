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

// User-specified workspace status categories
export const WORKSPACE_STATUS_CATEGORIES = [
  {
    category: "Not started",
    statuses: [
      { status: "to do", label: "TO DO", color: "#f59e0b", type: "open" },
    ],
  },
  {
    category: "Active",
    statuses: [
      { status: "ongoing", label: "ONGOING", color: "#eab308", type: "custom" },
      { status: "delayed", label: "DELAYED", color: "#dc2626", type: "custom" },
      { status: "recovery meeting", label: "RECOVERY MEETING", color: "#16a34a", type: "custom" },
    ],
  },
  {
    category: "Done",
    statuses: [
      { status: "completed 5 days ahead", label: "COMPLETED 5 DAYS AHEAD", color: "#7c3aed", type: "done" },
      { status: "completed 1 day ahead", label: "COMPLETED 1 DAY AHEAD", color: "#2563eb", type: "done" },
      { status: "completed on-time", label: "COMPLETED ON-TIME", color: "#0284c7", type: "done" },
      { status: "delayed completion", label: "DELAYED COMPLETION", color: "#db2777", type: "done" },
      { status: "onhold", label: "ONHOLD", color: "#ea580c", type: "done" },
      { status: "shelved", label: "SHELVED", color: "#6b7280", type: "done" },
    ],
  },
  {
    category: "Closed",
    statuses: [
      { status: "closed", label: "CLOSED", color: "#059669", type: "closed" },
    ],
  },
];

// Flat array of all statuses
export const ALL_WORKSPACE_STATUSES = WORKSPACE_STATUS_CATEGORIES.flatMap(
  (cat) => cat.statuses
);

// GET: Fetch tasks, members, list statuses, or discover lists
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

    // Fetch tasks, list info, and members in parallel
    const [tasksRes, listInfoRes, membersRes, teamsRes] = await Promise.all([
      fetch(
        `https://api.clickup.com/api/v2/list/${targetListId}/task?subtasks=true&include_closed=true`,
        {
          headers: { Authorization: token },
          cache: "no-store",
        }
      ),
      fetch(`https://api.clickup.com/api/v2/list/${targetListId}`, {
        headers: { Authorization: token },
        cache: "no-store",
      }).catch(() => null),
      fetch(`https://api.clickup.com/api/v2/list/${targetListId}/member`, {
        headers: { Authorization: token },
        cache: "no-store",
      }).catch(() => null),
      fetch(`https://api.clickup.com/api/v2/team`, {
        headers: { Authorization: token },
        cache: "no-store",
      }).catch(() => null),
    ]);

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

    // Parse list statuses
    let listStatuses: any[] = [];
    if (listInfoRes && listInfoRes.ok) {
      try {
        const listData = await listInfoRes.json();
        if (listData.statuses && Array.isArray(listData.statuses)) {
          listStatuses = listData.statuses.map((s: any) => ({
            status: s.status?.toLowerCase() || "",
            label: s.status?.toUpperCase() || "",
            color: s.color || "#808080",
            type: s.type || "custom",
          }));
        }
      } catch (e) {}
    }

    // Merge ClickUp statuses with user's specific workspace statuses
    const knownStatusMap = new Map<string, any>();
    ALL_WORKSPACE_STATUSES.forEach((s) => knownStatusMap.set(s.status.toLowerCase(), s));
    listStatuses.forEach((s) => {
      knownStatusMap.set(s.status.toLowerCase(), {
        ...s,
        label: s.status.toUpperCase(),
      });
    });
    const finalStatuses = Array.from(knownStatusMap.values());

    // Parse members (assignees)
    const membersMap = new Map<string, any>();

    // Check list-level members
    if (membersRes && membersRes.ok) {
      try {
        const membersData = await membersRes.json();
        for (const m of membersData.members || []) {
          membersMap.set(String(m.id), {
            id: m.id,
            username: m.username || m.email?.split("@")[0] || "Member",
            email: m.email || "",
            initials: m.initials || m.username?.[0]?.toUpperCase() || "?",
            profilePicture: m.profilePicture || null,
          });
        }
      } catch (e) {}
    }

    // Check team-level members fallback/enrichment
    if (teamsRes && teamsRes.ok) {
      try {
        const teamsData = await teamsRes.json();
        for (const team of teamsData.teams || []) {
          for (const m of team.members || []) {
            const user = m.user || m;
            if (user && user.id && !membersMap.has(String(user.id))) {
              membersMap.set(String(user.id), {
                id: user.id,
                username: user.username || user.email?.split("@")[0] || "Member",
                email: user.email || "",
                initials: user.initials || user.username?.[0]?.toUpperCase() || "?",
                profilePicture: user.profilePicture || null,
              });
            }
          }
        }
      } catch (e) {}
    }

    // Also extract assignees found in tasks themselves
    rawTasks.forEach((t: any) => {
      (t.assignees || []).forEach((a: any) => {
        if (!membersMap.has(String(a.id))) {
          membersMap.set(String(a.id), {
            id: a.id,
            username: a.username || "Member",
            email: a.email || "",
            initials: a.initials || a.username?.[0]?.toUpperCase() || "?",
            profilePicture: a.profilePicture || null,
          });
        }
      });
    });

    const members = Array.from(membersMap.values());

    // Map tasks to Project Echo standardized format
    const tasks = rawTasks.map((t: any) => {
      // Check for meeting tag
      const isMeetingTask = (t.tags || []).some(
        (tag: any) => tag.name?.toLowerCase() === "echo-meeting"
      );

      // Extract meeting title/context and echo_point_id from description if present
      let meetingTitle = "";
      let discussionPointId = "";
      const desc = t.text_content || t.description || "";
      
      const titleMatch = desc.match(/🔗\s*Echo Meeting:\s*([^\n\r]+)/i);
      if (titleMatch && titleMatch[1]) {
        meetingTitle = titleMatch[1].trim();
      }

      const pointMatch =
        desc.match(/<!--\s*echo_point_id:([^\s\-]+)\s*-->/i) ||
        desc.match(/\[Echo-Point-ID:\s*([^\s\]]+)\]/i);
      if (pointMatch && pointMatch[1]) {
        discussionPointId = pointMatch[1].trim();
      }

      const statusStr = t.status?.status?.toLowerCase() || "to do";
      const statusMeta = knownStatusMap.get(statusStr);

      return {
        id: t.id,
        name: t.name,
        description: desc,
        status: statusStr,
        statusColor: statusMeta?.color || t.status?.color || "#808080",
        statusType: statusMeta?.type || t.status?.type || "custom",
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
        discussionPointId,
        listId: targetListId,
      };
    });

    return NextResponse.json({
      tasks,
      total: tasks.length,
      listId: targetListId,
      members,
      statuses: finalStatuses,
      categories: WORKSPACE_STATUS_CATEGORIES,
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

    // Check if task with this discussionPointId already exists in this list to avoid duplicates
    if (body.discussionPointId) {
      try {
        const existingRes = await fetch(
          `https://api.clickup.com/api/v2/list/${targetListId}/task?subtasks=true&include_closed=true`,
          {
            headers: { Authorization: token },
            cache: "no-store",
          }
        );
        if (existingRes.ok) {
          const existingData = await existingRes.json();
          const found = (existingData.tasks || []).find((t: any) => {
            const d = t.text_content || t.description || "";
            return (
              d.includes(`echo_point_id:${body.discussionPointId}`) ||
              d.includes(`[Echo-Point-ID:${body.discussionPointId}]`)
            );
          });
          if (found) {
            return NextResponse.json({
              success: true,
              task: found,
              url: found.url,
              id: found.id,
              alreadyExisted: true,
              message: "Task already exists in ClickUp",
            });
          }
        }
      } catch (checkErr) {
        console.warn("Duplicate check failed:", checkErr);
      }
    }

    // Prepare description with Project Echo meeting footprint and unique ID
    let description = body.description || "";
    if (body.meetingTitle) {
      description += `\n\n---\n🔗 Echo Meeting: ${body.meetingTitle}`;
      if (body.meetingDate) {
        description += ` (${body.meetingDate})`;
      }
    }

    if (body.discussionPointId) {
      description += `\n<!-- echo_point_id:${body.discussionPointId} -->\n[Echo-Point-ID: ${body.discussionPointId}]`;
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
      discussionPointId: body.discussionPointId,
    });
  } catch (error: any) {
    console.error("ClickUp Tasks POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create task" },
      { status: 500 }
    );
  }
}

// PUT / PATCH: Update task status, priority, due date, assignees, or name
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
    if (body.assignees !== undefined && Array.isArray(body.assignees)) {
      payload.assignees = {
        add: body.assignees,
      };
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
