import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, getUserFromRequest, setAuthCookies, clearAuthCookies, ClickUpUserProfile } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  // 1. Try to read cached user profile from cookie
  const cachedUser = getUserFromRequest(req);
  if (cachedUser) {
    if (!cachedUser.workspaceName) {
      cachedUser.workspaceName = "Primephilippines";
    }
    return NextResponse.json({ authenticated: true, user: cachedUser });
  }

  // 2. Fetch from ClickUp user endpoint if not cached
  try {
    const userRes = await fetch("https://api.clickup.com/api/v2/user", {
      headers: {
        Authorization: token,
      },
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        // Token is invalid/expired
        const res = NextResponse.json({ authenticated: false, user: null });
        clearAuthCookies(res);
        return res;
      }
      // Return authenticated with fallback user
      return NextResponse.json({
        authenticated: true,
        user: { id: "user", username: "ClickUp User", email: "", initials: "CU", workspaceName: "Primephilippines" },
      });
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
      id: userData.user.id,
      username: userData.user.username || userData.user.email || "ClickUp User",
      email: userData.user.email || "",
      color: userData.user.color || "#C9AB4C",
      profilePicture: userData.user.profilePicture || null,
      workspaceName,
      initials:
        userData.user.initials ||
        (userData.user.username
          ? userData.user.username
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : "CU"),
    };

    const res = NextResponse.json({ authenticated: true, user });
    setAuthCookies(res, token, user);
    return res;
  } catch (err) {
    console.error("[ClickUp Auth] /api/auth/me error:", err);
    return NextResponse.json({
      authenticated: true,
      user: { id: "user", username: "ClickUp User", email: "", initials: "CU" },
    });
  }
}
