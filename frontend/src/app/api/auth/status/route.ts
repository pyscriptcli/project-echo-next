import { NextRequest, NextResponse } from "next/server";
import { getOAuthCredentials, getWorkspaceApiToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { clientId, clientSecret, redirectUri } = getOAuthCredentials();
  const url = new URL(req.url);

  // List keys present in process.env that relate to ClickUp without disclosing their values
  const detectedKeys = Object.keys(process.env).filter((k) =>
    k.toUpperCase().includes("CLICKUP") ||
    (typeof process.env[k] === "string" && process.env[k]?.trim().startsWith("pk_"))
  );

  const apiToken = getWorkspaceApiToken();

  return NextResponse.json({
    status: "ok",
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    hasApiToken: Boolean(apiToken),
    effectiveRedirectUri: redirectUri || `${url.origin}/api/auth/callback`,
    detectedClickUpEnvKeys: detectedKeys,
    note:
      !clientId || !clientSecret
        ? apiToken
          ? "OAuth Client ID not set, but CLICKUP_API_TOKEN is active. One-click workspace sign-in is ready."
          : "No ClickUp credentials detected. Please configure CLICKUP_CLIENT_ID & CLICKUP_CLIENT_SECRET or CLICKUP_API_TOKEN in Vercel and redeploy."
        : "OAuth credentials detected successfully.",
  });
}
