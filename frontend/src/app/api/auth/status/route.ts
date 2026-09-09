import { NextRequest, NextResponse } from "next/server";
import { getOAuthCredentials } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { clientId, clientSecret, redirectUri } = getOAuthCredentials();
  const url = new URL(req.url);

  // List keys present in process.env that relate to ClickUp without disclosing their values
  const detectedKeys = Object.keys(process.env).filter((k) =>
    k.toUpperCase().includes("CLICKUP")
  );

  return NextResponse.json({
    status: "ok",
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    effectiveRedirectUri: redirectUri || `${url.origin}/api/auth/callback`,
    detectedClickUpEnvKeys: detectedKeys,
    note:
      !clientId || !clientSecret
        ? "If you recently added these environment variables in Vercel, trigger a redeployment in Vercel (Deployments -> Redeploy) to inject them into the running serverless instances."
        : "Credentials detected successfully.",
  });
}
