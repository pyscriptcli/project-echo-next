import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { clickUpFetch as fetch } from "@/lib/clickupCalendarApi";
import { AdminConfigError, loadAdminConfig, saveAdminConfig } from "@/lib/admin-config/store";

export const dynamic = "force-dynamic";

function folderIdsFrom(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((id): id is string | number => typeof id === "string" || typeof id === "number").map(String).filter((id) => /^\d+$/.test(id))))
    : [];
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Sign in with ClickUp to create a contract workspace." }, { status: 401 });

  let body: { name?: unknown; spaceId?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Enter a workspace name and choose a Space." }, { status: 400 }); }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const spaceId = String(body.spaceId || "");
  if (!name || name.length > 100) return NextResponse.json({ error: "Enter a workspace name up to 100 characters." }, { status: 400 });
  if (!/^\d+$/.test(spaceId)) return NextResponse.json({ error: "Choose a valid ClickUp Space." }, { status: 400 });

  let config;
  try { config = await loadAdminConfig(); }
  catch (error) {
    const status = error instanceof AdminConfigError ? error.status : 503;
    return NextResponse.json({ error: "Shared contract settings are unavailable, so a workspace cannot be registered." }, { status });
  }

  const headers = { Authorization: token, "Content-Type": "application/json" };
  const spaceResponse = await fetch(`https://api.clickup.com/api/v2/space/${encodeURIComponent(spaceId)}`, { headers, cache: "no-store" }).catch(() => null);
  if (!spaceResponse?.ok) {
    const status = spaceResponse?.status || 502;
    return NextResponse.json({ error: status === 403 || status === 404 ? "This ClickUp account cannot access the selected Space." : `ClickUp could not verify the selected Space (${status}).` }, { status });
  }
  const spacePayload = await spaceResponse.json().catch(() => ({})) as { id?: string | number; name?: string; team_id?: string | number };
  if (String(spacePayload.id || "") !== spaceId) return NextResponse.json({ error: "ClickUp returned a different Space than the one selected." }, { status: 502 });

  const folderResponse = await fetch(`https://api.clickup.com/api/v2/space/${encodeURIComponent(spaceId)}/folder`, {
    method: "POST", headers, body: JSON.stringify({ name }), cache: "no-store",
  }).catch(() => null);
  if (!folderResponse?.ok) {
    const status = folderResponse?.status || 502;
    const payload = await folderResponse?.json().catch(() => ({})) as { err?: string; error?: string } | undefined;
    return NextResponse.json({ error: payload?.err || payload?.error || `ClickUp could not create the folder (${status}).` }, { status });
  }
  const created = await folderResponse.json().catch(() => ({})) as { id?: string | number; name?: string; url?: string };
  const folderId = String(created.id || "");
  if (!/^\d+$/.test(folderId)) return NextResponse.json({ error: "ClickUp created a folder but returned no valid folder ID. Refresh Contracts to check it." }, { status: 502 });

  try {
    const contractFolderIds = folderIdsFrom(config.contractFolderIds);
    const saved = await saveAdminConfig({ ...config, contractFolderIds: [...contractFolderIds, folderId] });
    return NextResponse.json({
      folder: {
        id: folderId, name: String(created.name || name), url: typeof created.url === "string" ? created.url : "",
        listCount: 0, spaceId, spaceName: String(spacePayload.name || "ClickUp Space"),
        teamId: spacePayload.team_id ? String(spacePayload.team_id) : "",
      },
      folderIds: folderIdsFrom(saved.contractFolderIds),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      error: "The ClickUp folder was created, but the shared Contracts list could not be updated. Refresh Contracts and use Choose folders to add it.",
      createdFolderId: folderId,
    }, { status: 503 });
  }
}
