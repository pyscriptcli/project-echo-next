import { NextRequest, NextResponse } from "next/server";
import { getOAuthCredentials } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { clientId, redirectUri: configuredUri } = getOAuthCredentials();
  const url = new URL(req.url);
  const redirectUri = configuredUri || `${url.origin}/api/auth/callback`;

  if (!clientId) {
    const detectedClickUpKeys = Object.keys(process.env)
      .filter((k) => k.toUpperCase().includes("CLICKUP"))
      .join(",");

    console.error("[ClickUp OAuth] Missing client_id. Detected ClickUp env keys:", detectedClickUpKeys);
    return NextResponse.redirect(
      new URL(
        `/?auth_error=missing_client_id&detected=${encodeURIComponent(detectedClickUpKeys)}`,
        req.url
      )
    );
  }

  const clickUpAuthUrl = new URL("https://app.clickup.com/api");
  clickUpAuthUrl.searchParams.set("client_id", clientId);
  clickUpAuthUrl.searchParams.set("redirect_uri", redirectUri);

  return NextResponse.redirect(clickUpAuthUrl.toString());
}
