import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Sign in with ClickUp to view Spaces and folders." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  try {
    const headers = { Authorization: token };
    const teamsResponse = await fetch("https://api.clickup.com/api/v2/team", { headers, cache: "no-store" });
    if (!teamsResponse.ok) return NextResponse.json({ error: `ClickUp could not load your workspaces (${teamsResponse.status}).` }, { status: teamsResponse.status, headers: { "Cache-Control": "no-store" } });
    const teamsPayload = await teamsResponse.json() as { teams?: Array<{ id: string | number; name?: string }> };
    const teamSpaces = await Promise.all((teamsPayload.teams || []).map(async (team) => {
      const response = await fetch(`https://api.clickup.com/api/v2/team/${encodeURIComponent(String(team.id))}/space?archived=false`, { headers, cache: "no-store" }).catch(() => null);
      if (!response?.ok) return [];
      const payload = await response.json().catch(() => ({})) as { spaces?: Array<{ id: string | number; name?: string }> };
      return (payload.spaces || []).map((space) => ({ id: String(space.id), name: String(space.name || "Untitled Space"), teamId: String(team.id), teamName: String(team.name || "ClickUp workspace") }));
    }));
    const spaces = teamSpaces.flat();
    const foldersBySpace = await Promise.all(spaces.map(async (space) => {
      const response = await fetch(`https://api.clickup.com/api/v2/space/${encodeURIComponent(space.id)}/folder?archived=false`, { headers, cache: "no-store" }).catch(() => null);
      if (!response?.ok) return [];
      const payload = await response.json().catch(() => ({})) as { folders?: Array<{ id: string | number; name?: string; url?: string; archived?: boolean; parent_folder?: string | number | null; lists?: unknown[] }> };
      return (payload.folders || []).filter((folder) => !folder.archived).map((folder) => ({
        id: String(folder.id), name: String(folder.name || "Untitled folder"),
        url: typeof folder.url === "string" ? folder.url : `https://app.clickup.com/${space.teamId}/v/o/f/${encodeURIComponent(String(folder.id))}`,
        listCount: Array.isArray(folder.lists) ? folder.lists.length : 0,
        spaceId: space.id, spaceName: space.name, teamId: space.teamId, teamName: space.teamName,
        parentFolderId: folder.parent_folder == null ? null : String(folder.parent_folder),
      }));
    }));
    return NextResponse.json({ spaces, folders: foldersBySpace.flat() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "ClickUp Spaces and folders could not be loaded." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
