import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { DEMANDS_CLICKUP_LIST_ID, formatDemandClickUpTitle } from "@/lib/demands/clickupSync";
import type { DemandLocationRequirement, DemandPriority, DemandRecord, DemandType } from "@/types/demands";

type ClickUpTask = {
  id: string;
  name?: string;
  url?: string;
  text_content?: string;
  description?: string;
  markdown_description?: string;
};

type DemandDraft = Omit<DemandRecord, "id" | "clickUpTaskId" | "clickUpUrl">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function normalizeDemand(value: unknown): DemandDraft | null {
  if (!isRecord(value)) return null;

  const client = text(value.client ?? value.company);
  const rawLocations = Array.isArray(value.locations) ? value.locations : [];
  const locations: DemandLocationRequirement[] = rawLocations.flatMap((item) => {
    if (!isRecord(item) || !text(item.area)) return [];
    return [{ id: text(item.id) || crypto.randomUUID(), gloc: text(item.gloc), city: text(item.city), area: text(item.area), priority: item.priority === "Secondary" || item.priority === "Tertiary" ? item.priority : "Primary" }];
  });
  if (locations.length === 0 && text(value.location)) locations.push({ id: crypto.randomUUID(), gloc: text(value.gloc), city: text(value.city), area: text(value.location), priority: "Primary" });
  if (!client || locations.length === 0) return null;

  const type = value.type === "CL" || value.type === "CS" || value.type === "INDL"
    ? value.type
    : value.segment === "Industrial" ? "INDL" : "CL";
  const date = text(value.date);

  return {
    date,
    quarter: text(value.quarter) || (date ? `${date.slice(0, 4)}Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}` : ""),
    assoc: text(value.assoc ?? value.associate),
    source: text(value.source),
    type,
    industry: text(value.industry),
    client,
    minSqm: Number(value.minSqm) || 0,
    maxSqm: Number(value.maxSqm) || 0,
    gloc: locations[0].gloc || text(value.gloc ?? value.market),
    city: locations[0].city || text(value.city),
    location: locations[0].area,
    priority: value.priority === "Priority" || value.priority === "Low" ? value.priority : "Normal",
    purpose: text(value.purpose),
    timeline: text(value.timeline),
    status: text(value.status) || (value.priority === "Shelved" ? "Shelved" : "Active"),
    remarks: text(value.remarks),
    actionTaken: text(value.actionTaken),
    fulfillmentMode: value.fulfillmentMode === "either" ? "either" : value.fulfillmentMode === "rollout" ? "rollout" : undefined,
    alternativeLocations: Array.isArray(value.alternativeLocations)
      ? value.alternativeLocations.filter((item): item is string => typeof item === "string")
      : undefined,
    locations,
  };
}

function parseTask(task: ClickUpTask): DemandRecord | null {
  try {
    const raw = task.text_content || task.description || task.markdown_description || "";
    const parsed: unknown = JSON.parse(raw);
    const payload = isRecord(parsed) && "echoDemand" in parsed ? parsed.echoDemand : parsed;
    const demand = normalizeDemand(payload);
    return demand
      ? { ...demand, id: task.id, clickUpTaskId: task.id, clickUpUrl: task.url }
      : null;
  } catch {
    return null;
  }
}

function buildDraft(value: unknown): DemandDraft | null {
  if (!isRecord(value) || !text(value.client) || !Array.isArray(value.locations)) return null;
  const date = new Date().toISOString().slice(0, 10);
  const locations: DemandLocationRequirement[] = value.locations.flatMap((location, index) => {
    if (!isRecord(location) || !text(location.area) || !text(location.city)) return [];
    return [{ id: crypto.randomUUID(), gloc: text(location.gloc), city: text(location.city), area: text(location.area), priority: location.priority === "Secondary" || location.priority === "Tertiary" ? location.priority : index === 0 ? "Primary" : "Secondary" }];
  });
  if (locations.length === 0) return null;

  const type: DemandType = value.type === "INDL" || value.type === "CS" ? value.type : "CL";
  const priority: DemandPriority = value.priority === "Priority" || value.priority === "Low" ? value.priority : "Normal";
  const fulfillmentMode = value.fulfillmentMode === "either" ? "either" : "rollout";
  return {
    date,
    quarter: `${date.slice(0, 4)}Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`,
    assoc: text(value.assoc), source: text(value.source), type,
    industry: text(value.industry), client: text(value.client),
    minSqm: Number(value.minSqm) || 0,
    maxSqm: Number(value.maxSqm) || Number(value.minSqm) || 0,
    gloc: locations[0].gloc, city: locations[0].city, location: locations[0].area,
    priority, purpose: text(value.purpose), timeline: text(value.timeline),
    status: text(value.status) || "Active", remarks: text(value.remarks),
    actionTaken: text(value.actionTaken), fulfillmentMode,
    alternativeLocations: fulfillmentMode === "either" ? locations.map((location) => location.area) : [],
    locations,
  };
}
async function listDemands(token: string): Promise<DemandRecord[]> {
  const demands: DemandRecord[] = [];
  for (let page = 0; ; page += 1) {
    const response = await fetch(
      `https://api.clickup.com/api/v2/list/${DEMANDS_CLICKUP_LIST_ID}/task?include_closed=true&include_markdown_description=true&page=${page}`,
      { headers: { Authorization: token }, cache: "no-store" },
    );
    if (!response.ok) throw new Error("Unable to load demands right now.");
    const body: unknown = await response.json();
    const tasks = isRecord(body) && Array.isArray(body.tasks) ? body.tasks as ClickUpTask[] : [];
    demands.push(...tasks.map(parseTask).filter((demand): demand is DemandRecord => demand !== null));
    if (tasks.length < 100) return demands;
  }
}

function getUserToken(request: NextRequest) {
  return getTokenFromRequest(request);
}

export async function GET(request: NextRequest) {
  const token = getUserToken(request);
  if (!token) return NextResponse.json({ error: "Sign in to load demands." }, { status: 401 });

  try {
    return NextResponse.json({ demands: await listDemands(token) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load demands." },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const token = getUserToken(request);
  if (!token) return NextResponse.json({ error: "Sign in to save demands." }, { status: 401 });

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: "Invalid demand details." }, { status: 400 });

    const draft = buildDraft(body);
    if (!draft) {
      return NextResponse.json({ error: "Add at least one target location." }, { status: 400 });
    }

    const taskResponse = await fetch(
      `https://api.clickup.com/api/v2/list/${DEMANDS_CLICKUP_LIST_ID}/task`,
      {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formatDemandClickUpTitle({ ...draft, id: "new" }),
          description: JSON.stringify({ echoDemand: draft }, null, 2),
          tags: ["demand", draft.type.toLowerCase(), draft.status.toLowerCase()],
        }),
      },
    );
    if (!taskResponse.ok) throw new Error("Unable to save a demand right now.");

    const task: ClickUpTask = await taskResponse.json();
    const saved = parseTask(task) ?? { ...draft, id: task.id, clickUpTaskId: task.id, clickUpUrl: task.url };
    return NextResponse.json({ success: true, created: [saved] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save demands." },
      { status: 502 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const token = getUserToken(request);
  if (!token) return NextResponse.json({ error: "Sign in to update demands." }, { status: 401 });

  try {
    const body: unknown = await request.json();
    if (!isRecord(body) || !text(body.id)) {
      return NextResponse.json({ error: "A demand record is required." }, { status: 400 });
    }

    const demand = normalizeDemand(body);
    if (!demand) return NextResponse.json({ error: "Check the demand details and try again." }, { status: 400 });

    const response = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(text(body.id))}`, {
      method: "PUT",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formatDemandClickUpTitle({ ...demand, id: text(body.id) }),
        description: JSON.stringify({ echoDemand: demand }, null, 2),
      }),
    });
    if (!response.ok) throw new Error("Unable to update this demand right now.");

    const task: ClickUpTask = await response.json();
    const updated = parseTask(task) ?? { ...demand, id: text(body.id), clickUpTaskId: text(body.id), clickUpUrl: task.url };
    return NextResponse.json({ success: true, demand: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update this demand." },
      { status: 502 },
    );
  }
}
