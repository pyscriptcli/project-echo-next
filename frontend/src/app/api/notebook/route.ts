import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, getWorkspaceApiToken } from "@/lib/auth";

const DAILY_LOG_LIST_ID = "901418075633";

const CATEGORY_MATCHERS = {
  client: (name: string) => name.includes("client"),
  admin: (name: string) => name.includes("admin"),
  adhoc: (name: string) => name.includes("adhoc") || name.includes("ad hoc"),
  meetings: (name: string) => name.includes("meeting"),
} as const;

type CategoryKey = keyof typeof CATEGORY_MATCHERS;

interface RawClickUpTask {
  id: string;
  name?: string;
  parent?: string;
  url?: string;
  due_date?: string | null;
  start_date?: string | null;
  assignees?: Array<{
    id?: number | string;
    username?: string;
    email?: string;
    initials?: string;
    profilePicture?: string | null;
  }>;
  custom_fields?: Array<{ name?: string; type?: string; value?: unknown }>;
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function extractText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    for (const key of ["text", "value", "name", "label"]) {
      const parsed = extractText(objectValue[key]);
      if (parsed) return parsed;
    }
  }
  return "";
}

function validIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateFromTask(task: RawClickUpTask): string | null {
  const name = task.name || "";
  const numeric = name.match(/\b(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})\b/);
  if (numeric) return validIsoDate(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]));

  const monthNames: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10,
    october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };
  const written = name.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})\b/i);
  if (written) {
    return validIsoDate(Number(written[3]), monthNames[written[1].toLowerCase()], Number(written[2]));
  }

  const timestamp = task.due_date || task.start_date;
  if (timestamp) return new Date(Number(timestamp)).toISOString().slice(0, 10);
  return null;
}

function suffixOwner(name = "") {
  const match = name.match(/\s[-–—]\s([^–—-]+)$/);
  return match?.[1]?.trim() || "";
}

function monthFromTaskName(name = "") {
  const monthNames: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10,
    october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };
  const match = name.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(20\d{2})\b/i);
  if (!match) return null;
  return `${match[2]}-${String(monthNames[match[1].toLowerCase()]).padStart(2, "0")}`;
}

function taskOwner(task: RawClickUpTask, byId: Map<string, RawClickUpTask>) {
  let current: RawClickUpTask | undefined = task;
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const assignee = current.assignees?.[0];
    if (assignee?.username || assignee?.email) {
      return {
        id: String(assignee.id || assignee.email || assignee.username),
        name: assignee.username || assignee.email || "Unassigned",
        email: assignee.email || "",
        initials: assignee.initials || (assignee.username || assignee.email || "?").slice(0, 2).toUpperCase(),
        profilePicture: assignee.profilePicture || null,
      };
    }
    const parsedName = suffixOwner(current.name);
    if (parsedName) {
      return {
        id: parsedName.toLowerCase().replace(/\s+/g, "-"),
        name: parsedName,
        email: "",
        initials: parsedName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        profilePicture: null,
      };
    }
    current = current.parent ? byId.get(String(current.parent)) : undefined;
  }
  return { id: "unassigned", name: "Unassigned", email: "", initials: "?", profilePicture: null };
}

async function fetchAllTasks(token: string) {
  const all: RawClickUpTask[] = [];
  for (let page = 0; page < 20; page += 1) {
    const response = await fetch(
      `https://api.clickup.com/api/v2/list/${DAILY_LOG_LIST_ID}/task?include_closed=true&subtasks=true&page=${page}`,
      { headers: { Authorization: token }, cache: "no-store" },
    );
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || `ClickUp returned ${response.status}`);
    }
    const body = await response.json();
    const tasks = (body.tasks || []) as RawClickUpTask[];
    all.push(...tasks);
    if (tasks.length < 100 || body.last_page === true) break;
  }
  return all;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req) || getWorkspaceApiToken();
  if (!token) {
    return NextResponse.json({ error: "ClickUp authentication required." }, { status: 401 });
  }

  try {
    const rawTasks = await fetchAllTasks(token);
    const byId = new Map(rawTasks.map((task) => [String(task.id), task]));
    const members = new Map<string, ReturnType<typeof taskOwner>>();
    const memberMonths = new Map<string, Set<string>>();

    const entries = rawTasks.flatMap((task) => {
      const date = dateFromTask(task);
      const owner = taskOwner(task, byId);
      if (owner.id !== "unassigned") {
        members.set(owner.id, owner);
        const taskMonth = monthFromTaskName(task.name);
        if (taskMonth) {
          const months = memberMonths.get(owner.id) || new Set<string>();
          months.add(taskMonth);
          memberMonths.set(owner.id, months);
        }
      }

      const categories = Object.fromEntries(
        Object.keys(CATEGORY_MATCHERS).map((key) => [key, ""]),
      ) as Record<CategoryKey, string>;

      for (const field of task.custom_fields || []) {
        const fieldName = normalizeFieldName(field.name || "");
        const category = (Object.keys(CATEGORY_MATCHERS) as CategoryKey[]).find((key) => CATEGORY_MATCHERS[key](fieldName));
        if (category) categories[category] = extractText(field.value);
      }

      const hasRecognizedFields = Object.values(categories).some(Boolean) ||
        (task.custom_fields || []).some((field) =>
          (Object.keys(CATEGORY_MATCHERS) as CategoryKey[]).some((key) => CATEGORY_MATCHERS[key](normalizeFieldName(field.name || ""))),
        );

      if (!date || (!hasRecognizedFields && !task.parent)) return [];
      return [{
        id: String(task.id),
        name: task.name || date,
        date,
        url: task.url || "",
        member: owner,
        categories,
        hasContent: Object.values(categories).some((value) => value.trim().length > 0),
      }];
    });

    return NextResponse.json({
      listId: DAILY_LOG_LIST_ID,
      entries,
      members: Array.from(members.values())
        .map((member) => ({ ...member, months: Array.from(memberMonths.get(member.id) || []) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Notebook ClickUp read failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read the ClickUp daily log." },
      { status: 502 },
    );
  }
}
