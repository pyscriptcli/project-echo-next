import { NextRequest, NextResponse } from "next/server";
import { getOAuthCredentials } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { clientId, redirectUri: configuredUri } = getOAuthCredentials();
  const url = new URL(req.url);
  const redirectUri = configuredUri || `${url.origin}/api/auth/callback`;

  // Echo uses a separate OAuth connection for every signed-in user. A shared
  // workspace token must never be used as a fallback because it can bypass
  // the user's ClickUp permissions.
  if (clientId) {
    const clickUpAuthUrl = new URL("https://app.clickup.com/api");
    clickUpAuthUrl.searchParams.set("client_id", clientId);
    clickUpAuthUrl.searchParams.set("redirect_uri", redirectUri);
    return NextResponse.redirect(clickUpAuthUrl.toString());
  }

  // OAuth is intentionally required; do not silently sign everybody in with
  // an administrator/workspace token.
  const detectedClickUpKeys = Object.keys(process.env)
    .filter((k) => k.toUpperCase().includes("CLICKUP"))
    .join(",");

  return NextResponse.redirect(
    new URL(
      `/?auth_error=missing_credentials&detected=${encodeURIComponent(detectedClickUpKeys)}`,
      req.url
    )
  );
}
