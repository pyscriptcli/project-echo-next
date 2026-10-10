import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";
import { loadAdminConfig } from "@/lib/admin-config/store";
import { resolveAccess, type AppPage } from "@/lib/access-control";
import { clickUpFetch as clickUpRequest } from "@/lib/clickupCalendarApi";

const OWNER_EMAIL = "admin@primephilippines.com";
const BA_OWNER_EMAIL = "dave.policarpio@primephilippines.com";

export async function authorizeBARequest(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const cachedUser = token ? getUserFromRequest(req) : null;
  if (!cachedUser?.email || !cachedUser.id) return { user: null, denied: NextResponse.json({ error: "Sign in to use Business Analysis." }, { status: 401 }) };
  const identityResponse = await clickUpRequest("https://api.clickup.com/api/v2/user", { headers: { Authorization: token }, cache: "no-store" });
  const identityBody = identityResponse.ok ? await identityResponse.json().catch(() => ({})) : {};
  const identity = identityBody.user;
  if (!identity?.id || String(identity.id) !== String(cachedUser.id) || String(identity.email || "").toLowerCase().trim() !== cachedUser.email.toLowerCase().trim()) {
    return { user: null, denied: NextResponse.json({ error: "Your sign-in could not be verified. Sign in again." }, { status: 401 }) };
  }
  const user = { ...cachedUser, id: identity.id, email: String(identity.email).toLowerCase().trim(), username: String(identity.username || cachedUser.username) };
  const email = user.email.toLowerCase().trim();
  const config = await loadAdminConfig();
  const isAdmin = email === OWNER_EMAIL || Boolean(config.admins && Array.isArray(config.admins) && config.admins.some((entry: unknown) => {
    const admin = entry as { email?: unknown; active?: unknown };
    return admin.active !== false && String(admin.email || "").toLowerCase().trim() === email;
  }));
  const access = resolveAccess(email, config);
  const permission = Array.isArray(config.pagePermissions) ? config.pagePermissions.find((entry: unknown) => {
    const rule = entry as { email?: unknown };
    return String(rule.email || "").toLowerCase().trim() === email;
  }) as { allowedPages?: unknown } | undefined : undefined;
  const explicitlyGranted = Array.isArray(permission?.allowedPages) && permission.allowedPages.includes("business-analysis");
  const allowed = isAdmin || email === BA_OWNER_EMAIL || (explicitlyGranted && access.allowedPages.includes("business-analysis" as AppPage));
  if (!allowed) return { user, denied: NextResponse.json({ error: "Business Analysis is not enabled for your account." }, { status: 403 }) };
  return { user, denied: null };
}

export function getBAStorage() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
  if (!url || !key) throw new Error("Supabase is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
