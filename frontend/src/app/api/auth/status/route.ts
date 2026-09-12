import { NextRequest, NextResponse } from "next/server";
import { getOAuthCredentials } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { clientId, clientSecret, redirectUri } = getOAuthCredentials();
  const url = new URL(req.url);

  // List keys present in process.env that relate to ClickUp without disclosing their values
  const detectedKeys = Object.keys(process.env).filter((k) =>
    k.toUpperCase().includes("CLICKUP") ||
    (typeof process.env[k] === "string" && process.env[k]?.trim().startsWith("pk_"))
  );

  return NextResponse.json({
    status: "ok",
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    hasApiToken: false,
    effectiveRedirectUri: redirectUri || `${url.origin}/api/auth/callback`,
    detectedClickUpEnvKeys: detectedKeys,
    note:
      !clientId || !clientSecret
        ? "ClickUp OAuth is not configured. Add CLICKUP_CLIENT_ID and CLICKUP_CLIENT_SECRET, then redeploy."
        : "ClickUp OAuth is ready. Each Echo user will connect their own ClickUp account.",
  });
}
