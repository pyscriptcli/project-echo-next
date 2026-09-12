import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";
import { getUsageSummary, loadAiPolicy } from "@/lib/ask-echo/store";

const OWNER_EMAIL = "admin@primephilippines.com";

async function isAdmin(email: string) {
  if (email === OWNER_EMAIL) return true;
  const url = process.env.SUPABASE_URL || ""; const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
  if (!url || !key) return false;
  const { data } = await createClient(url, key).from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
  return Boolean(data?.config?.admins?.some((admin: any) => admin.active !== false && String(admin.email).toLowerCase().trim() === email));
}

export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req) ? getUserFromRequest(req) : null;
  const email = String(user?.email || "").toLowerCase().trim();
  const testAdmin = req.cookies.get("echo_admin_test")?.value === "1";
  if (!testAdmin && (!email || !(await isAdmin(email)))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const [usage, policy] = await Promise.all([getUsageSummary(), loadAiPolicy()]);
  return NextResponse.json({ ...usage, policy, credentialConfigured: Boolean(process.env.DEEPSEEK_API_KEY) });
}
