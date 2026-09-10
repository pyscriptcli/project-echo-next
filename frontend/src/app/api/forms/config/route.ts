import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";

const OWNER_EMAIL = "dave.policarpio@primephilippines.com";
const DEFAULT_CONFIG = { admins: [], members: [], departments: ["Finance", "Procurement", "Operations", "Human Resources", "Marketing", "IT", "General"], mappings: [] };

function client() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
  return url && key ? createClient(url, key) : null;
}

function isOwnerOrAdmin(req: NextRequest, config: any) {
  const user = getUserFromRequest(req);
  const email = (user?.email || "").toLowerCase();
  return email === OWNER_EMAIL || Boolean(config?.admins?.some((admin: any) => admin.active !== false && String(admin.email).toLowerCase() === email));
}

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
  const supabase = client();
  if (!supabase) return NextResponse.json({ config: null, source: "local" });
  const { data, error } = await supabase.from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
  if (error) return NextResponse.json({ config: null, source: "local", warning: "Supabase Forms configuration table is not available." });
  if (!isOwnerOrAdmin(req, data?.config || DEFAULT_CONFIG)) return NextResponse.json({ error: "Forms admin permission required" }, { status: 403 });
  return NextResponse.json({ config: data?.config || DEFAULT_CONFIG, source: "supabase" });
}

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
  const supabase = client();
  if (!supabase) return NextResponse.json({ saved: false, source: "local", warning: "Supabase is not configured." }, { status: 503 });
  const body = await req.json();
  const { data: existing } = await supabase.from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
  if (!isOwnerOrAdmin(req, existing?.config || DEFAULT_CONFIG)) return NextResponse.json({ error: "Forms admin permission required" }, { status: 403 });
  const { error } = await supabase.from("echo_forms_config").upsert({ id: "global", config: body, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, source: "supabase" });
}
