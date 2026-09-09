import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies, ClickUpUserProfile, getOAuthCredentials } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    console.error("[ClickUp OAuth] Callback error or missing code:", error);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error || "missing_code")}`, req.url)
    );
  }

  const { clientId, clientSecret } = getOAuthCredentials();

  if (!clientId || !clientSecret) {
    console.error("[ClickUp OAuth] Missing CLICKUP_CLIENT_ID or CLICKUP_CLIENT_SECRET in env");
    return NextResponse.redirect(
      new URL("/?auth_error=missing_credentials", req.url)
    );
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://api.clickup.com/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[ClickUp OAuth] Token exchange failed:", tokenRes.status, errBody);
      return NextResponse.redirect(
        new URL("/?auth_error=token_exchange_failed", req.url)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("[ClickUp OAuth] No access_token in response:", tokenData);
      return NextResponse.redirect(
        new URL("/?auth_error=no_access_token", req.url)
      );
    }

    // 2. Fetch authenticated ClickUp user profile
    let userProfile: ClickUpUserProfile | undefined;
    try {
      const userRes = await fetch("https://api.clickup.com/api/v2/user", {
        headers: {
          Authorization: accessToken,
        },
      });

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
      } else {
        console.warn("[ClickUp OAuth] Failed to fetch user profile, status:", userRes.status);
      }
    } catch (err) {
      console.warn("[ClickUp OAuth] Error fetching user profile:", err);
    }

    // 3. Set session cookies and redirect to home
    const response = NextResponse.redirect(new URL("/", req.url));
    setAuthCookies(response, accessToken, userProfile);
    return response;
  } catch (err: any) {
    console.error("[ClickUp OAuth] Callback exception:", err);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(err.message || "callback_exception")}`, req.url)
    );
  }
}
