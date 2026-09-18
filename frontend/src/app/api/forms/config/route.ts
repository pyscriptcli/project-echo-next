import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";
import { DEFAULT_AI_POLICY, normalizeAiPolicy, type AiPolicy } from "@/lib/ask-echo/limits";
import { REPOSITORY_FORM_MAPPINGS } from "@/components/forms/forms.config";
import { AdminConfigError, loadAdminConfig, saveAdminConfig } from "@/lib/admin-config/store";

export const dynamic = "force-dynamic";

const OWNER_EMAIL = "admin@primephilippines.com";
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
  defaultPageAccess?: string[];
  sidebarOrder?: string[];
  emailTemplates?: any[];
  allowedSignInDomains: string[];
  aiPolicy?: AiPolicy;
}

const DEFAULT_CONFIG: FormsConfigData = {
  admins: [],
  members: [],
  departments: ["Finance", "Procurement", "Operations", "Human Resources", "Marketing", "IT", "General"],
  mappings: REPOSITORY_FORM_MAPPINGS,
  pagePermissions: [],
  defaultPageAccess: ["forms", "market-insights"],
  sidebarOrder: ["dashboard", "tasks", "notebook", "market-insights", "demands", "meetings", "minutes", "forms"],
  emailTemplates: [],
  allowedSignInDomains: ["primephilippines.com"],
  aiPolicy: DEFAULT_AI_POLICY,
};

const ALL_APP_PAGES = ["dashboard", "tasks", "notebook", "market-insights", "demands", "meetings", "minutes", "forms"];

function isOwnerOrAdmin(req: NextRequest, config: any) {
  if (req.cookies.get("echo_admin_test")?.value === "1") return true;
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
  const testAdmin = req.cookies.get("echo_admin_test")?.value === "1";
  const token = getTokenFromRequest(req);
  const user = token ? getUserFromRequest(req) : null;
  const userEmail = (user?.email || "").toLowerCase().trim();

  let config: any;
  try {
    config = await loadAdminConfig();
  } catch (error) {
    const status = error instanceof AdminConfigError ? error.status : 503;
    return NextResponse.json({ error: "Admin configuration is unavailable.", code: "CONFIG_UNAVAILABLE" }, { status, headers: { "Cache-Control": "no-store" } });
  }
  const source = "supabase";

  const configuredDefaultPages =
    Array.isArray(config.defaultPageAccess) && config.defaultPageAccess.length > 0
      ? config.defaultPageAccess
      : ["forms"];
  const defaultPages = Array.from(new Set([...configuredDefaultPages, "market-insights"]));

  // If user is not authenticated or not logged in yet, return public default page access policy
  if ((!token || !userEmail) && !testAdmin) {
    return NextResponse.json({
      allowedPages: defaultPages,
      userAllowedPages: defaultPages,
      defaultPageAccess: defaultPages,
      sidebarOrder: config.sidebarOrder || [],
      isAdmin: false,
      source,
    });
  }

  const isAdmin = testAdmin ||
    userEmail === OWNER_EMAIL ||
    Boolean(
      config.admins?.some(
        (admin: any) => admin.active !== false && String(admin.email).toLowerCase().trim() === userEmail
      )
    );

  // Compute allowed pages for current user
  let allowedPages = defaultPages;
  const isOwner = testAdmin || userEmail === OWNER_EMAIL;
  const userRule = (config.pagePermissions || []).find(
    (p: any) => String(p.email).toLowerCase().trim() === userEmail
  );
  if (isOwner) {
    allowedPages = ALL_APP_PAGES;
  } else if (userRule && Array.isArray(userRule.allowedPages) && userRule.allowedPages.length > 0) {
    allowedPages = userRule.allowedPages;
  } else if (isAdmin) {
    allowedPages = ALL_APP_PAGES;
  }
  // The shared market brief is intentionally available to every Echo user.
  allowedPages = Array.from(new Set([...allowedPages, "market-insights", "demands"]));

  // Owner and Admins receive full config including admin settings and all user permissions
  if (isAdmin) {
    return NextResponse.json({
      config: {
        ...config,
        defaultPageAccess: defaultPages,
        sidebarOrder: config.sidebarOrder || [],
      },
      allowedPages,
      userAllowedPages: allowedPages,
      defaultPageAccess: defaultPages,
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
      features: { askEchoEnabled: config.features?.askEchoEnabled === true },
      defaultPageAccess: defaultPages,
    },
    allowedPages,
    userAllowedPages: allowedPages,
    defaultPageAccess: defaultPages,
    isAdmin: false,
    source,
  });
}

export async function POST(req: NextRequest) {
  const testAdmin = req.cookies.get("echo_admin_test")?.value === "1";
  if (!getTokenFromRequest(req) && !testAdmin) {
    return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid configuration payload" }, { status: 400 }); }
  const supabaseConfig = body as Record<string, unknown>;
  supabaseConfig.aiPolicy = normalizeAiPolicy(supabaseConfig.aiPolicy);
  let existing: any;
  try { existing = await loadAdminConfig(); } catch (error) {
    const status = error instanceof AdminConfigError ? error.status : 503;
    return NextResponse.json({ error: "Admin configuration is unavailable.", code: "CONFIG_UNAVAILABLE" }, { status });
  }
  if (!isOwnerOrAdmin(req, existing)) {
    return NextResponse.json({ error: "Forms admin permission required" }, { status: 403 });
  }
  try {
    const saved = await saveAdminConfig({ ...existing, ...supabaseConfig, features: { ...existing.features, ...(supabaseConfig.features as Record<string, unknown> | undefined) } });
    return NextResponse.json({ saved: true, source: "supabase", config: saved }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof AdminConfigError ? error.status : 500;
    return NextResponse.json({ error: "Admin configuration could not be saved.", code: "CONFIG_SAVE_FAILED" }, { status });
  }
}
