import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { AdminConfigError, loadAdminConfig, saveAdminConfig } from "@/lib/admin-config/store";

export const dynamic = "force-dynamic";

function folderIdsFrom(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((id): id is string | number => typeof id === "string" || typeof id === "number").map(String).filter((id) => /^\d+$/.test(id))))
    : [];
}

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Sign in with ClickUp to view contract folders." }, { status: 401 });
  try {
    const config = await loadAdminConfig();
    return NextResponse.json({ folderIds: folderIdsFrom(config.contractFolderIds) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof AdminConfigError ? error.status : 503;
    return NextResponse.json({ error: "Contract folder settings could not be loaded." }, { status });
  }
}

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Sign in with ClickUp to manage contract folders." }, { status: 401 });
  try {
    const body = await req.json();
    if (!Array.isArray(body.folderIds) || body.folderIds.length > 200 || body.folderIds.some((id: unknown) => !/^\d+$/.test(String(id)))) {
      return NextResponse.json({ error: "Choose up to 200 valid ClickUp folders." }, { status: 400 });
    }
    const folderIds = folderIdsFrom(body.folderIds);
    const config = await loadAdminConfig();
    const saved = await saveAdminConfig({ ...config, contractFolderIds: folderIds });
    return NextResponse.json({ success: true, folderIds: folderIdsFrom(saved.contractFolderIds) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof AdminConfigError ? error.status : 503;
    return NextResponse.json({ error: "Contract folder selection could not be saved." }, { status });
  }
}
