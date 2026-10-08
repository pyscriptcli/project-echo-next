import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { formatEchoDate } from "@/lib/dateUtils";
import { clearClickUpCalendarCache, clickUpCalendarFetch } from "@/lib/clickupCalendarApi";
import { WORKSPACE_STATUS_CATEGORIES, ALL_WORKSPACE_STATUSES } from "@/lib/clickupStatuses";
import { loadAdminConfig, saveAdminConfig } from "@/lib/admin-config/store";

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

function clickUpDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serializeProjectTask(task: ClickUpProjectTask, listId: string): ClickUpProjectResponseTask {
  return {
    id: String(task.id), name: String(task.name || "Untitled task"), url: typeof task.url === "string" ? task.url : null,
    parentId: task.parent ? String(task.parent) : null, listId,
    status: String(task.status?.status || "Open"), statusType: String(task.status?.type || ""),
    description: String(task.description_text || task.description || ""),
    startDate: clickUpDate(task.start_date), dueDate: clickUpDate(task.due_date),
    assignees: Array.isArray(task.assignees) ? task.assignees.map((assignee) => ({
      id: String(assignee.id), name: String(assignee.username || assignee.name || "Team member"),
      initials: String(assignee.initials || assignee.username?.[0] || "?").slice(0, 2),
    })) : [],
  };
}

async function fetchProjectListTasks(token: string, listId: string) {
  const tasks: ClickUpProjectTask[] = [];
  for (let page = 0; ; page += 1) {
    const response = await clickUpCalendarFetch(token, `https://api.clickup.com/api/v2/list/${encodeURIComponent(listId)}/task?subtasks=true&include_closed=true&page=${page}`);
    if (!response.ok) throw new Error(`Unable to load tasks for subproject ${listId} (${response.status}).`);
    const payload = await response.json() as { tasks?: ClickUpProjectTask[] };
    const batch = Array.isArray(payload.tasks) ? payload.tasks : [];
    tasks.push(...batch);
    if (batch.length < 100) break;
  }
  return tasks.map((task) => serializeProjectTask(task, listId));
}

interface ClickUpProjectList {
  id: string | number;
  name?: string;
  task_count?: number;
  url?: string;
  statuses?: Array<{ status?: string; type?: string }>;
}

interface ClickUpProjectTask {
  id: string | number;
  name?: string;
  description?: string | null;
  description_text?: string | null;
  url?: string;
  parent?: string | number | null;
  status?: { status?: string; type?: string } | null;
  start_date?: number | string | null;
  due_date?: number | string | null;
  assignees?: Array<{
    id: string | number;
    username?: string;
    name?: string;
    initials?: string;
  }>;
}

interface ClickUpProjectFolder {
  id?: string | number;
  name?: string;
  url?: string;
  space?: { id?: string | number; name?: string } | null;
}

interface ClickUpProjectResponseTask {
  id: string;
  name: string;
  url: string | null;
  parentId: string | null;
  listId: string;
  status: string;
  statusType: string;
  description: string;
  startDate: string | null;
  dueDate: string | null;
  assignees: Array<{ id: string; name: string; initials: string; profilePicture?: string | null }>;
}

interface ClickUpProjectMember {
  id: string | number;
  username?: string;
  name?: string;
  initials?: string;
  profilePicture?: string | null;
  profile_picture?: string | null;
  email?: string;
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

const ACTION_PLAN_START = "<!-- PROJECT_ECHO_ACTION_PLAN_START -->";
const ACTION_PLAN_END = "<!-- PROJECT_ECHO_ACTION_PLAN_END -->";

function readActionPlan(content: string) {
  return content.match(/<!-- PROJECT_ECHO_ACTION_PLAN_START -->\r?\n([\s\S]*?)\r?\n<!-- PROJECT_ECHO_ACTION_PLAN_END -->/)?.[1] || "";
}

function replaceActionPlan(content: string, actionPlan: string) {
  const block = actionPlan ? `${ACTION_PLAN_START}\n${actionPlan.replace(/<!-- PROJECT_ECHO_ACTION_PLAN_(?:START|END) -->/g, "")}\n${ACTION_PLAN_END}` : "";
  const start = content.indexOf(ACTION_PLAN_START);
  const end = start < 0 ? -1 : content.indexOf(ACTION_PLAN_END, start);
  const remainder = (start >= 0 && end >= 0 ? `${content.slice(0, start)}${content.slice(end + ACTION_PLAN_END.length)}` : content).trim();
  return [remainder, block].filter(Boolean).join("\n\n");
}

// User-specified workspace status categories

// GET: Fetch tasks, members, list statuses, or discover lists
export async function GET(req: NextRequest) {
  try {
    const { token, listId } = getClickUpCredentials(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const targetListId = searchParams.get("listId") || listId;

    if (action === "project-gallery") {
      const projectToken = getTokenFromRequest(req);
      if (!projectToken) return NextResponse.json({ error: "Sign in with ClickUp to view projects.", needsAuth: true }, { status: 401, headers: { "Cache-Control": "no-store" } });
      if (searchParams.get("refresh") === "1") clearClickUpCalendarCache(projectToken, [`/folder/${searchParams.get("folderId") || "901414174663"}`]);
      const anchorFolderId = "901414174663";
      const clickUpGet = (path: string) => clickUpCalendarFetch(projectToken, `https://api.clickup.com/api/v2${path}`);
      const anchorResponse = await clickUpGet(`/folder/${anchorFolderId}`);
      if (!anchorResponse.ok) return NextResponse.json({ error: `ClickUp could not load the configured project folder (${anchorResponse.status}).` }, { status: anchorResponse.status });
      const anchor = await anchorResponse.json() as ClickUpProjectFolder;
      const spaceId = anchor.space?.id;
      if (!spaceId) return NextResponse.json({ error: "The configured ClickUp folder has no accessible Space." }, { status: 422 });
      const foldersResponse = await clickUpGet(`/space/${encodeURIComponent(String(spaceId))}/folder?archived=false`);
      if (!foldersResponse.ok) return NextResponse.json({ error: `ClickUp could not load project folders (${foldersResponse.status}).` }, { status: foldersResponse.status });
      const foldersPayload = await foldersResponse.json() as { folders?: Array<{ id: string | number; name?: string; archived?: boolean; url?: string; lists?: ClickUpProjectList[] }> };
      const folders = (foldersPayload.folders || []).filter((folder) => !folder.archived);
      const projects = await Promise.all(folders.map(async (folder) => {
        let folderLists = folder.lists;
        if (!Array.isArray(folderLists)) {
          const listsResponse = await clickUpGet(`/folder/${encodeURIComponent(String(folder.id))}/list?archived=false`);
          if (!listsResponse.ok) throw new Error(`Unable to load lists for project folder ${folder.id} (${listsResponse.status}).`);
          const listsPayload = await listsResponse.json() as { lists?: ClickUpProjectList[] };
          folderLists = listsPayload.lists || [];
        }
        return {
          id: String(folder.id),
          name: String(folder.name || "Untitled project"),
          url: typeof folder.url === "string" ? folder.url : `https://app.clickup.com/9014981136/v/o/f/${encodeURIComponent(String(folder.id))}`,
          listCount: folderLists.length,
          spaceName: String(anchor.space?.name || ""),
        };
      }));
      return NextResponse.json({ space: { id: String(spaceId), name: String(anchor.space?.name || "ClickUp Space") }, projects }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "project-workspace") {
      const projectToken = getTokenFromRequest(req);
      if (!projectToken) {
        return NextResponse.json({ error: "Sign in with ClickUp to open this project.", needsAuth: true }, { status: 401, headers: { "Cache-Control": "no-store" } });
      }
      const folderId = searchParams.get("folderId") || "901414174663";
      if (searchParams.get("refresh") === "1") clearClickUpCalendarCache(projectToken, [`/folder/${folderId}`]);
      if (!/^\d+$/.test(folderId)) return NextResponse.json({ error: "Invalid project folder." }, { status: 400 });
      const clickUpGet = (path: string) => clickUpCalendarFetch(projectToken, `https://api.clickup.com/api/v2${path}`);
      const [folderResponse, listsResponse] = await Promise.all([
        clickUpGet(`/folder/${folderId}`),
        clickUpGet(`/folder/${folderId}/list`),
      ]);

      if (!folderResponse.ok) {
        const status = folderResponse.status;
        return NextResponse.json({
          error: status === 401 ? "Your ClickUp session has expired. Sign in again to continue." : status === 403 || status === 404 ? "This ClickUp account cannot access the linked project folder." : `ClickUp could not load the project folder (${status}).`,
        }, { status, headers: { "Cache-Control": "no-store" } });
      }
      if (!listsResponse.ok) {
        return NextResponse.json({ error: `ClickUp could not load the project lists (${listsResponse.status}).` }, { status: listsResponse.status, headers: { "Cache-Control": "no-store" } });
      }

      const [folder, listsPayload] = await Promise.all([
        folderResponse.json() as Promise<ClickUpProjectFolder>,
        listsResponse.json() as Promise<{ lists?: ClickUpProjectList[] }>,
      ]);
      const rawLists = Array.isArray(listsPayload.lists) ? listsPayload.lists : [];
      const memberMap = new Map<string, ClickUpProjectMember>();
      const spaceId = folder.space?.id;
      if (spaceId) {
        const membersResponse = await clickUpGet(`/space/${encodeURIComponent(String(spaceId))}/member`);
        if (membersResponse.ok) {
          const membersPayload = await membersResponse.json() as { members?: Array<{ user?: ClickUpProjectMember } | ClickUpProjectMember> };
          for (const entry of membersPayload.members || []) {
            const member = "user" in entry && entry.user ? entry.user : entry as ClickUpProjectMember;
            memberMap.set(String(member.id), member);
          }
        }
      }
      const members = Array.from(memberMap.values()).map((member) => ({
        id: String(member.id),
        name: String(member.username || member.name || member.email || "Team member"),
        initials: String(member.initials || member.username?.[0] || member.name?.[0] || "?").slice(0, 2),
        profilePicture: member.profilePicture || member.profile_picture || null,
      }));
      const projectConfig = await loadAdminConfig().catch(() => null);
      const storedAssignees = projectConfig && typeof projectConfig.projectDefaultAssignees === "object" && projectConfig.projectDefaultAssignees
        ? projectConfig.projectDefaultAssignees as Record<string, string[]>
        : {};
      const defaultAssignees = Object.fromEntries(Object.entries(storedAssignees).map(([listId, ids]) => [listId, Array.isArray(ids) ? ids.slice(0, 1) : []]));
      return NextResponse.json({
        folder: {
          id: folderId,
          name: String(folder.name || "Project"),
          url: typeof folder.url === "string" ? folder.url : `https://app.clickup.com/9014981136/v/o/f/${encodeURIComponent(folderId)}`,
          spaceName: String(folder.space?.name || ""),
        },
        lists: rawLists.map((list) => ({ id: String(list.id), name: String(list.name || "Untitled list"), url: list.url || null, taskCount: Number(list.task_count) || 0, statuses: Array.isArray(list.statuses) ? list.statuses.map((item) => String(item.status || "")).filter(Boolean) : [] })),
        tasks: [],
        members,
        defaultAssignees,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "project-list-tasks") {
      const projectToken = getTokenFromRequest(req);
      const projectFolderId = searchParams.get("folderId") || "";
      const projectListId = searchParams.get("listId") || "";
      if (!projectToken) return NextResponse.json({ error: "Sign in with ClickUp to view subproject tasks." }, { status: 401 });
      if (!/^\d+$/.test(projectFolderId) || !/^\d+$/.test(projectListId)) return NextResponse.json({ error: "A valid project and subproject are required." }, { status: 400 });
      if (searchParams.get("refresh") === "1") clearClickUpCalendarCache(projectToken, [`/list/${projectListId}/task`]);
      const folderListsResponse = await clickUpCalendarFetch(projectToken, `https://api.clickup.com/api/v2/folder/${projectFolderId}/list`);
      const folderListsPayload = await folderListsResponse.json().catch(() => ({}));
      if (!folderListsResponse.ok) return NextResponse.json({ error: folderListsPayload.err || "Unable to verify the subproject." }, { status: folderListsResponse.status });
      const belongsToFolder = ((folderListsPayload.lists || []) as ClickUpProjectList[]).some((list) => String(list.id) === projectListId);
      if (!belongsToFolder) return NextResponse.json({ error: "This subproject does not belong to the selected project." }, { status: 403 });
      try {
        const tasks = await fetchProjectListTasks(projectToken, projectListId);
        return NextResponse.json({ tasks }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load subproject tasks." }, { status: 502 });
      }
    }

    if (action === "project-tasks") {
      const projectToken = getTokenFromRequest(req);
      const projectFolderId = searchParams.get("folderId") || "";
      if (!projectToken) return NextResponse.json({ error: "Sign in with ClickUp to view project tasks." }, { status: 401 });
      if (!/^\d+$/.test(projectFolderId)) return NextResponse.json({ error: "A valid project is required." }, { status: 400 });
      const listResponse = await clickUpCalendarFetch(projectToken, `https://api.clickup.com/api/v2/folder/${projectFolderId}/list`);
      const listsPayload = await listResponse.json().catch(() => ({}));
      if (!listResponse.ok) return NextResponse.json({ error: listsPayload.err || "Unable to load project subprojects." }, { status: listResponse.status });
      try {
        const lists = (listsPayload.lists || []) as ClickUpProjectList[];
        if (searchParams.get("refresh") === "1") clearClickUpCalendarCache(projectToken, lists.map((list) => `/list/${String(list.id)}/task`));
        const groups = await Promise.all(lists.map((list) => fetchProjectListTasks(projectToken, String(list.id))));
        return NextResponse.json({ tasks: groups.flat() }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load project tasks." }, { status: 502 });
      }
    }

    if (action === "project-action-plan") {
      const projectToken = getTokenFromRequest(req);
      const folderId = searchParams.get("folderId") || "";
      const subprojectListId = searchParams.get("listId") || "";
      if (!projectToken) return NextResponse.json({ error: "Sign in with ClickUp to view this action plan." }, { status: 401 });
      if (!/^\d+$/.test(folderId) || !/^\d+$/.test(subprojectListId)) return NextResponse.json({ error: "A valid project and subproject are required." }, { status: 400 });
      const response = await clickUpCalendarFetch(projectToken, `https://api.clickup.com/api/v2/list/${subprojectListId}`);
      const list = await response.json().catch(() => ({}));
      if (!response.ok) return NextResponse.json({ error: list.err || "Unable to load the subproject action plan." }, { status: response.status });
      if (String(list.folder?.id || "") !== folderId) return NextResponse.json({ error: "This subproject does not belong to the selected project." }, { status: 403 });
      return NextResponse.json({ actionPlan: readActionPlan(String(list.markdown_content || list.content || "")) }, { headers: { "Cache-Control": "no-store" } });
    }

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
        spaceId?: string;
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
                  spaceId: String(space.id),
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
                    spaceId: String(space.id),
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

    if (action === "space-lists") {
      const spaceId = searchParams.get("spaceId");
      if (!spaceId) {
        return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
      }
      const [folderlessRes, foldersRes, spaceRes] = await Promise.all([
        fetch(`https://api.clickup.com/api/v2/space/${spaceId}/list`, { headers: { Authorization: token }, cache: "no-store" }).catch(() => null),
        fetch(`https://api.clickup.com/api/v2/space/${spaceId}/folder`, { headers: { Authorization: token }, cache: "no-store" }).catch(() => null),
        fetch(`https://api.clickup.com/api/v2/space/${spaceId}`, { headers: { Authorization: token }, cache: "no-store" }).catch(() => null),
      ]);
      const spaceData = spaceRes?.ok ? await spaceRes.json().catch(() => ({})) : {};
      const spaceName = spaceData.name || `Space ${spaceId}`;
      const lists: Array<{ id: string; name: string; folderName?: string; spaceId: string; spaceName: string }> = [];

      if (folderlessRes && folderlessRes.ok) {
        const d = await folderlessRes.json().catch(() => ({}));
        for (const l of d.lists || []) {
          lists.push({ id: String(l.id), name: l.name, spaceId, spaceName });
        }
      }
      if (foldersRes && foldersRes.ok) {
        const d = await foldersRes.json().catch(() => ({}));
        for (const f of d.folders || []) {
          for (const l of f.lists || []) {
            lists.push({ id: String(l.id), name: l.name, folderName: f.name, spaceId, spaceName });
          }
        }
      }
      return NextResponse.json({ lists, space: { id: spaceId, name: spaceName } });
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
    const action = req.nextUrl.searchParams.get("action");
    const projectToken = getTokenFromRequest(req);
    if (action === "project-action-plan") {
      const folderId = String(body.folderId || "");
      const subprojectListId = String(body.listId || "");
      const actionPlan = String(body.actionPlan || "").trim();
      if (!projectToken) return NextResponse.json({ error: "Sign in with ClickUp to save this action plan." }, { status: 401 });
      if (!/^\d+$/.test(folderId) || !/^\d+$/.test(subprojectListId)) return NextResponse.json({ error: "A valid project and subproject are required." }, { status: 400 });
      if (actionPlan.length > 2_000) return NextResponse.json({ error: "Keep the action plan under 2,000 characters." }, { status: 400 });
      const listUrl = `https://api.clickup.com/api/v2/list/${subprojectListId}`;
      const currentResponse = await clickUpCalendarFetch(projectToken, listUrl);
      const currentList = await currentResponse.json().catch(() => ({}));
      if (!currentResponse.ok) return NextResponse.json({ error: currentList.err || "Unable to load the subproject description." }, { status: currentResponse.status });
      if (String(currentList.folder?.id || "") !== folderId) return NextResponse.json({ error: "This subproject does not belong to the selected project." }, { status: 403 });
      const markdown_content = replaceActionPlan(String(currentList.markdown_content || currentList.content || ""), actionPlan);
      const response = await clickUpCalendarFetch(projectToken, listUrl, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markdown_content }) }, [`/list/${subprojectListId}`]);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return NextResponse.json({ error: result.err || result.error || "Unable to save the action plan." }, { status: response.status });
      return NextResponse.json({ success: true, actionPlan });
    }
    if (action === "project-task-update" || action === "project-task-create") {
      if (!projectToken) return NextResponse.json({ error: "Sign in with ClickUp to update this calendar." }, { status: 401 });
      if (action === "project-task-update") {
        if (!body.taskId) return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
        const payload: Record<string, unknown> = {};
        if (body.dueDate !== undefined) payload.due_date = body.dueDate ? new Date(body.dueDate).getTime() : null;
        if (body.startDate !== undefined) payload.start_date = body.startDate ? new Date(body.startDate).getTime() : null;
        if (body.status !== undefined) payload.status = String(body.status).trim();
        if (body.description !== undefined) {
          const description = String(body.description);
          if (description.length > 10_000) return NextResponse.json({ error: "Keep task remarks under 10,000 characters." }, { status: 400 });
          payload.description = description;
        }
        if (payload.status === "") return NextResponse.json({ error: "Task status cannot be empty." }, { status: 400 });
        const response = await clickUpCalendarFetch(projectToken, `https://api.clickup.com/api/v2/task/${encodeURIComponent(String(body.taskId))}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        }, body.listId && /^\d+$/.test(String(body.listId)) ? [`/list/${String(body.listId)}/task`] : undefined);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) return NextResponse.json({ error: result.err || result.error || "Unable to update task in ClickUp." }, { status: response.status });
        return NextResponse.json({ success: true, task: result });
      }
      if (!body.listId || !String(body.name || "").trim()) return NextResponse.json({ error: "A list and task name are required." }, { status: 400 });
      const payload: Record<string, unknown> = { name: String(body.name).trim(), status: body.status || "to do" };
      if (body.description) payload.description = String(body.description);
      if (body.priority) payload.priority = priorityToNumber(body.priority);
      const requestedAssignees = Array.isArray(body.assignees) ? body.assignees : [];
      let assigneeIds = requestedAssignees.map(Number).filter(Number.isFinite);
      if (assigneeIds.length === 0) {
        const config = await loadAdminConfig().catch(() => null);
        const defaults = config?.projectDefaultAssignees && typeof config.projectDefaultAssignees === "object"
          ? config.projectDefaultAssignees as Record<string, string[]>
          : {};
        assigneeIds = (defaults[String(body.listId)] || []).slice(0, 1).map(Number).filter(Number.isFinite);
      }
      if (assigneeIds.length) payload.assignees = assigneeIds;
      if (body.dueDate) { payload.due_date = new Date(body.dueDate).getTime(); payload.due_date_time = false; }
      if (body.startDate) { payload.start_date = new Date(body.startDate).getTime(); payload.start_date_time = false; }
      const response = await clickUpCalendarFetch(projectToken, `https://api.clickup.com/api/v2/list/${encodeURIComponent(String(body.listId))}/task`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      }, [`/list/${String(body.listId)}/task`]);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return NextResponse.json({ error: result.err || result.error || "Unable to create task in ClickUp." }, { status: response.status });
      return NextResponse.json({ success: true, task: result });
    }
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
