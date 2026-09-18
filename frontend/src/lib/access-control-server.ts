import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";
import { loadAdminConfig } from "@/lib/admin-config/store";
import { canUseFeature, resolveAccess, type FeatureId } from "@/lib/access-control";

export async function requireFeature(req: NextRequest, feature: FeatureId): Promise<NextResponse | null> {
  const token = getTokenFromRequest(req);
  const user = getUserFromRequest(req);
  if (!token || !user?.email) return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 });
  const config = await loadAdminConfig();
  const access = resolveAccess(user.email, config);
  if (!canUseFeature(feature, access)) {
    return NextResponse.json({ error: "This feature is not enabled for your account.", code: "FEATURE_FORBIDDEN", feature }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  return null;
}
