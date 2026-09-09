import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies, ClickUpUserProfile, cleanEnv } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = cleanEnv(body.token);

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid ClickUp API token." },
        { status: 400 }
      );
    }

    // Verify token with ClickUp API
    const userRes = await fetch("https://api.clickup.com/api/v2/user", {
      headers: { Authorization: token },
    });

    if (!userRes.ok) {
      return NextResponse.json(
        { success: false, error: "Invalid ClickUp API token. Please copy the full token from ClickUp Settings > ClickUp API." },
        { status: 401 }
      );
    }

    const userData = await userRes.json();
    let workspaceName = "Primephilippines";
    try {
      const teamRes = await fetch("https://api.clickup.com/api/v2/team", {
        headers: { Authorization: token },
      });
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        if (teamData.teams?.[0]?.name) {
          workspaceName = teamData.teams[0].name;
        }
      }
    } catch {}

    const user: ClickUpUserProfile = {
      id: userData.user?.id || "user",
      username: userData.user?.username || userData.user?.email || "ClickUp User",
      email: userData.user?.email || "",
      color: userData.user?.color || "#C9AB4C",
      profilePicture: userData.user?.profilePicture || null,
      workspaceName,
      initials:
        userData.user?.initials ||
        (userData.user?.username
          ? userData.user.username
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : "CU"),
    };

    const res = NextResponse.json({ success: true, user });
    setAuthCookies(res, token, user);
    return res;
  } catch (err: any) {
    console.error("[ClickUp Token Login] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
