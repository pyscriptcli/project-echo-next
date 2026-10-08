import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { AdminConfigError, loadAdminConfig, saveAdminConfig } from "@/lib/admin-config/store";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Sign in with ClickUp to update project assignees." }, { status: 401 });
  try {
    const body = await req.json();
    const listId = String(body.listId || "");
    const assigneeIds: string[] = Array.isArray(body.assigneeIds) ? Array.from(new Set<string>(body.assigneeIds.map(String).filter((id: string) => /^\d+$/.test(id)))).slice(0, 1) : [];
    if (!/^\d+$/.test(listId)) return NextResponse.json({ error: "Choose a valid subproject." }, { status: 400 });
    const config = await loadAdminConfig();
    const defaults = config.projectDefaultAssignees && typeof config.projectDefaultAssignees === "object" && !Array.isArray(config.projectDefaultAssignees)
      ? config.projectDefaultAssignees as Record<string, string[]>
      : {};
    if (assigneeIds.length) defaults[listId] = assigneeIds;
    else delete defaults[listId];
    await saveAdminConfig({ ...config, projectDefaultAssignees: defaults });
    return NextResponse.json({ listId, assigneeIds }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof AdminConfigError ? error.status : 503;
    return NextResponse.json({ error: "The subproject assignees could not be saved." }, { status });
  }
}
