import { NextRequest, NextResponse } from "next/server";
import { getOAuthCredentials, getWorkspaceApiToken, setAuthCookies, ClickUpUserProfile } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { clientId, redirectUri: configuredUri } = getOAuthCredentials();
  const url = new URL(req.url);
  const redirectUri = configuredUri || `${url.origin}/api/auth/callback`;

  // 1. If full OAuth app credentials exist, redirect to ClickUp OAuth 2.0 consent flow
  if (clientId) {
    const clickUpAuthUrl = new URL("https://app.clickup.com/api");
    clickUpAuthUrl.searchParams.set("client_id", clientId);
    clickUpAuthUrl.searchParams.set("redirect_uri", redirectUri);
    return NextResponse.redirect(clickUpAuthUrl.toString());
  }

  // 2. If OAuth app is not yet configured (e.g. non-admin ClickUp account),
  // but CLICKUP_API_TOKEN exists in Vercel environment, authenticate immediately via workspace token!
  const apiToken = getWorkspaceApiToken();

  if (apiToken) {
    try {
      // Fetch authenticated ClickUp profile
      const userRes = await fetch("https://api.clickup.com/api/v2/user", {
        headers: {
          Authorization: apiToken,
        },
      });

      let userProfile: ClickUpUserProfile = {
        id: "clickup-user",
        username: "ClickUp User",
        email: "",
        initials: "CU",
        color: "#C9AB4C",
      };

      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.user) {
          userProfile = {
            id: userData.user.id,
            username: userData.user.username || userData.user.email || "ClickUp User",
            email: userData.user.email || "",
            color: userData.user.color || "#C9AB4C",
            profilePicture: userData.user.profilePicture || null,
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
        }
      }

      const res = NextResponse.redirect(new URL("/", req.url));
      setAuthCookies(res, apiToken, userProfile);
      return res;
    } catch (err) {
      console.error("[ClickUp Auth] Instant workspace sign-in error:", err);
    }
  }

  // 3. Neither OAuth Client ID nor CLICKUP_API_TOKEN found in environment
  const detectedClickUpKeys = Object.keys(process.env)
    .filter((k) => k.toUpperCase().includes("CLICKUP"))
    .join(",");

  return NextResponse.redirect(
    new URL(
      `/?auth_error=missing_client_id&detected=${encodeURIComponent(detectedClickUpKeys)}`,
      req.url
    )
  );
}
