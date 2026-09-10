import { NextRequest, NextResponse } from "next/server";
import { formatEchoDate } from "@/lib/dateUtils";
import { WORKSPACE_STATUS_CATEGORIES, ALL_WORKSPACE_STATUSES } from "@/lib/clickupStatuses";

function getClickUpCredentials(req: NextRequest) {
  const cookieToken = req.cookies.get("echo_clickup_token")?.value || "";
  const token =
    req.headers.get("x-clickup-token") ||
    cookieToken ||
    process.env.CLICKUP_API_TOKEN ||
    "";
  const listId =
    req.nextUrl.searchParams.get("listId") ||
    req.headers.get("x-clickup-list-id") ||
    req.cookies.get("echo_clickup_list_id")?.value ||
    process.env.CLICKUP_DEFAULT_LIST_ID ||
    "";
  return { token: token.trim(), listId: listId.trim() };
}

// Map ClickUp priority numbers (1: Urgent, 2: High, 3: Normal, 4: Low)
function priorityToNumber(priority: string | number): number | null {
  if (typeof priority === "number") return priority;
  const p = priority?.toLowerCase() || "";
  if (p.includes("urgent")) return 1;
  if (p.includes("high")) return 2;
  if (p.includes("normal") || p.includes("medium")) return 3;
  if (p.includes("low")) return 4;
  return 3;
}

function numberToPriority(num: number | null | undefined): string {
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
            "ClickUp authentication required. Please sign in with ClickUp or provide an API token.",
          needsAuth: true,
        },
        { status: 401 }
      );
    }

    // Discovery action: fetch all accessible teams, spaces, folders, and lists in parallel
    if (action === "discover") {
      const teamsRes = await fetch("https://api.clickup.com/api/v2/team", {
        headers: { Authorization: token },
        cache: "no-store",
      });
      if (!teamsRes.ok) {
        return NextResponse.json(
          { error: `ClickUp authentication failed (${teamsRes.status}): ${teamsRes.statusText}`, needsAuth: true },
          { status: teamsRes.status }
        );
      }
      const teamsData = await teamsRes.json();
      const discoveredLists: Array<{
        id: string;
        name: string;
        spaceName: string;
        folderName?: string;
        teamName: string;
      }> = [];
      const discoveredSpaces: Array<{ id: string; name: string; teamName: string }> = [];

      for (const team of teamsData.teams || []) {
        const spacesRes = await fetch(
          `https://api.clickup.com/api/v2/team/${team.id}/space`,
          { headers: { Authorization: token }, cache: "no-store" }
        );
        if (!spacesRes.ok) continue;
        const spacesData = await spacesRes.json();
        const spaces = spacesData.spaces || [];
        spaces.forEach((space: any) => discoveredSpaces.push({ id: String(space.id), name: space.name, teamName: team.name }));

        // Parallelize fetching lists and folders across all spaces in this team
        await Promise.all(
          spaces.map(async (space: any) => {
            const [folderlessRes, foldersRes] = await Promise.all([
              fetch(`https://api.clickup.com/api/v2/space/${space.id}/list`, {
                headers: { Authorization: token },
                cache: "no-store",
              }).catch(() => null),
              fetch(`https://api.clickup.com/api/v2/space/${space.id}/folder`, {
                headers: { Authorization: token },
                cache: "no-store",
              }).catch(() => null),
            ]);

            if (folderlessRes && folderlessRes.ok) {
              const folderlessData = await folderlessRes.json().catch(() => ({}));
              for (const list of folderlessData.lists || []) {
                discoveredLists.push({
                  id: String(list.id),
                  name: list.name,
                  spaceName: space.name,
                  teamName: team.name,
                });
              }
            }

            if (foldersRes && foldersRes.ok) {
              const foldersData = await foldersRes.json().catch(() => ({}));
              for (const folder of foldersData.folders || []) {
                for (const list of folder.lists || []) {
                  discoveredLists.push({
                    id: String(list.id),
                    name: list.name,
                    folderName: folder.name,
                    spaceName: space.name,
                    teamName: team.name,
                  });
                }
              }
            }
          })
        );
      }

      // Sort discovered lists by spaceName, then folderName, then list name
      discoveredLists.sort((a, b) => {
        const spaceCompare = (a.spaceName || "").localeCompare(b.spaceName || "");
        if (spaceCompare !== 0) return spaceCompare;
        const folderCompare = (a.folderName || "").localeCompare(b.folderName || "");
        if (folderCompare !== 0) return folderCompare;
        return (a.name || "").localeCompare(b.name || "");
      });

      return NextResponse.json({ lists: discoveredLists, spaces: discoveredSpaces, count: discoveredLists.length });
    }

    // Default action: Fetch tasks from targetListId
    if (!targetListId) {
      return NextResponse.json(
        {
          error:
            "No ClickUp List selected. Please select a ClickUp list from your workspace.",
          needsListSelection: true,
        },
        { status: 400 }
      );
    }

    // Fetch tasks, list info, and list-specific members in parallel
    const [tasksRes, listInfoRes, listMembersRes] = await Promise.all([
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
    ]);

    if (!tasksRes.ok) {
      let errMsg = "Failed to fetch tasks from ClickUp";
      try {
        const errJson = await tasksRes.json();
        errMsg = errJson.err || errJson.error || errMsg;
      } catch (e) {}
      const isNotFound = tasksRes.status === 404 || errMsg.toLowerCase().includes("list not found");
      return NextResponse.json(
        {
          error: isNotFound
            ? "ClickUp list not found. Please select a valid list from your workspace."
            : errMsg,
          needsListSelection: isNotFound,
        },
        { status: tasksRes.status }
      );
    }

    const tasksData = await tasksRes.json();
    const rawTasks = tasksData.tasks || [];

    // Parse list statuses & space ID
    let listStatuses: any[] = [];
    let spaceId: string | null = null;
    let listName = "";
    let spaceName = "";
    let folderName = "";
    if (listInfoRes && listInfoRes.ok) {
      try {
        const listData = await listInfoRes.json();
        listName = listData.name || "";
        if (listData.space && listData.space.id) {
          spaceId = String(listData.space.id);
          spaceName = listData.space.name || "";
        }
        if (listData.folder && listData.folder.name) {
          folderName = listData.folder.name || "";
        }
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

    // Parse members - RESTRICT TO THIS SPACE AND LIST ONLY
    const membersMap = new Map<string, any>();

    // 1. Fetch space members if spaceId is resolved
    if (spaceId) {
      try {
        const spaceMembersRes = await fetch(
          `https://api.clickup.com/api/v2/space/${spaceId}/member`,
          {
            headers: { Authorization: token },
            cache: "no-store",
          }
        );
        if (spaceMembersRes.ok) {
          const spaceMembersData = await spaceMembersRes.json();
          for (const m of spaceMembersData.members || []) {
            membersMap.set(String(m.id), {
              id: m.id,
              username: m.username || m.email?.split("@")[0] || "Member",
              email: m.email || "",
              initials: m.initials || m.username?.[0]?.toUpperCase() || "?",
              profilePicture: m.profilePicture || null,
            });
          }
        }
      } catch (e) {
        console.warn("Could not fetch space members:", e);
      }
    }

    // 2. Also check list-level members
    if (listMembersRes && listMembersRes.ok) {
      try {
        const membersData = await listMembersRes.json();
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
      // Check for meeting tag (supports both 'echo' and 'echo-meeting')
      const isMeetingTask = (t.tags || []).some((tag: any) => {
        const tagName = tag.name?.toLowerCase() || "";
        return tagName === "echo" || tagName === "echo-meeting";
      });

      // Extract meeting title/context and echo_point_id from description if present
      let meetingTitle = "";
      let discussionPointId = "";
      const desc = t.text_content || t.description || "";
      
      const titleMatch =
        desc.match(/•\s*Meeting:\s*([^\n\r]+)/i) ||
        desc.match(/•\s*\*\*Meeting:\*\*\s*([^\n\r]+)/i) ||
        desc.match(/Meeting:\s*([^\n\r]+)/i) ||
        desc.match(/🔗\s*Echo Meeting:\s*([^\n\r]+)/i);
      if (titleMatch && titleMatch[1]) {
        // Strip out trailing date parenthesis like (September 9, 2026) if present
        meetingTitle = titleMatch[1].replace(/\s*\([^)]*\)$/, "").trim();
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
      listName: listName || "Active List",
      spaceName: spaceName || "",
      folderName: folderName || "",
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
              d.includes(`[Echo-Point-ID:${body.discussionPointId}]`) ||
              t.name.trim().toLowerCase() === body.name.trim().toLowerCase()
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

    // Prepare clean executive description format (no #, no *, no icons, no promotional footer)
    let description = "";
    if (body.structuredDescription || body.topic || body.evidence || body.discussion) {
      const taskTitle = body.name.trim();
      const pic = body.personInCharge || body.assigneeName || "Unassigned";
      const topic = body.topic || "Discussion Point";
      const discussion = body.discussion || body.description || "N/A";
      const evidence = body.evidence || "";
      const meetingTitle = body.meetingTitle || "Echo Meeting";
      const meetingDate = body.meetingDate ? formatEchoDate(body.meetingDate) : formatEchoDate(new Date());

      description = [
        `Action Item: ${taskTitle}`,
        "",
        `Person in Charge:`,
        `${pic}`,
        "",
        `Executive Context:`,
        `• Meeting: ${meetingTitle}`,
        `• Date: ${meetingDate}`,
        `• Topic: ${topic}`,
        "",
        `Discussion & Decisions:`,
        `${discussion}`,
        ...(evidence ? [
          "",
          `Evidence & Transcript Reference:`,
          `"${evidence}"`,
        ] : []),
      ].join("\n");
    } else {
      description = body.description || "";
      if (body.meetingTitle) {
        const mDate = body.meetingDate ? ` (${formatEchoDate(body.meetingDate)})` : "";
        description += `\n\nMeeting: ${body.meetingTitle}${mDate}`;
      }
    }

    const payload: Record<string, any> = {
      name: body.name.trim(),
      description,
      tags: ["echo"],
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
