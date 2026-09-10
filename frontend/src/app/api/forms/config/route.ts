import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";

const OWNER_EMAIL = "dave.policarpio@primephilippines.com";
interface UserPagePermission {
  email: string;
  name?: string;
  allowedPages: string[];
}

interface FormsConfigData {
  admins: any[];
  members: any[];
  departments: string[];
  mappings: any[];
  pagePermissions: UserPagePermission[];
}

const DEFAULT_CONFIG: FormsConfigData = {
  admins: [],
  members: [],
  departments: ["Finance", "Procurement", "Operations", "Human Resources", "Marketing", "IT", "General"],
  mappings: [],
  pagePermissions: [],
};

const ALL_APP_PAGES = ["dashboard", "tasks", "meetings", "minutes", "forms"];

function client() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
  return url && key ? createClient(url, key) : null;
}

function isOwnerOrAdmin(req: NextRequest, config: any) {
  const user = getUserFromRequest(req);
  const email = (user?.email || "").toLowerCase().trim();
  return (
    email === OWNER_EMAIL ||
    Boolean(
      config?.admins?.some(
        (admin: any) => admin.active !== false && String(admin.email).toLowerCase().trim() === email
      )
    )
  );
}

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) {
    return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
  }

  const user = getUserFromRequest(req);
  const userEmail = (user?.email || "").toLowerCase().trim();

  const supabase = client();
  let config = DEFAULT_CONFIG;
  let source = "local";

  if (supabase) {
    const { data, error } = await supabase
      .from("echo_forms_config")
      .select("config")
      .eq("id", "global")
      .maybeSingle();

    if (!error && data?.config) {
      config = { ...DEFAULT_CONFIG, ...data.config, pagePermissions: data.config.pagePermissions || [] };
      source = "supabase";
    }
  }

  const isAdmin =
    userEmail === OWNER_EMAIL ||
    Boolean(
      config.admins?.some(
        (admin: any) => admin.active !== false && String(admin.email).toLowerCase().trim() === userEmail
      )
    );

  // Compute allowed pages for current user
  let allowedPages = ALL_APP_PAGES;
  if (!isAdmin && userEmail) {
    const userRule = (config.pagePermissions || []).find(
      (p: any) => String(p.email).toLowerCase().trim() === userEmail
    );
    if (userRule && Array.isArray(userRule.allowedPages) && userRule.allowedPages.length > 0) {
      allowedPages = userRule.allowedPages;
    }
  }

  // Owner and Admins receive full config including admin settings and all user permissions
  if (isAdmin) {
    return NextResponse.json({
      config,
      allowedPages,
      userAllowedPages: allowedPages,
      isAdmin: true,
      source,
    });
  }

  // Non-admins receive their allowed pages and safe forms config
  return NextResponse.json({
    config: {
      departments: config.departments || [],
      members: (config.members || []).map((m: any) => ({
        email: m.email,
        name: m.name,
        role: m.role,
        department: m.department,
      })),
      mappings: (config.mappings || []).map((m: any) => ({
        id: m.id,
        department: m.department,
        formType: m.formType,
        formLabel: m.formLabel,
        listId: m.listId,
      })),
    },
    allowedPages,
    userAllowedPages: allowedPages,
    isAdmin: false,
    source,
  });
}

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) {
    return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
  }

  const supabase = client();
  if (!supabase) {
    return NextResponse.json({ saved: false, source: "local", warning: "Supabase is not configured." }, { status: 503 });
  }

  const body = await req.json();
  const { data: existing } = await supabase.from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
  if (!isOwnerOrAdmin(req, existing?.config || DEFAULT_CONFIG)) {
    return NextResponse.json({ error: "Forms admin permission required" }, { status: 403 });
  }

  const { error } = await supabase.from("echo_forms_config").upsert(
    { id: "global", config: body, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, source: "supabase" });
}
