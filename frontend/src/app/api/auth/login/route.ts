import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.CLICKUP_CLIENT_ID?.trim();
  const url = new URL(req.url);
  const redirectUri =
    process.env.CLICKUP_REDIRECT_URI?.trim() ||
    `${url.origin}/api/auth/callback`;

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/?auth_error=missing_client_id", req.url)
    );
  }

  const clickUpAuthUrl = new URL("https://app.clickup.com/api");
  clickUpAuthUrl.searchParams.set("client_id", clientId);
  clickUpAuthUrl.searchParams.set("redirect_uri", redirectUri);

  return NextResponse.redirect(clickUpAuthUrl.toString());
}
