export type EchoSourcePage = "meetings" | "tasks" | "notebook" | "forms" | "demands" | "market-insights";
export type EchoPage = EchoSourcePage | "dashboard" | "minutes";

const ALL_PAGES: EchoPage[] = ["dashboard", "tasks", "notebook", "market-insights", "demands", "meetings", "minutes", "forms"];
const SOURCE_PAGES: EchoSourcePage[] = ["meetings", "tasks", "notebook", "forms", "demands", "market-insights"];

interface AccessConfig {
  defaultPageAccess?: string[];
  pagePermissions?: Array<{ email: string; allowedPages: string[] }>;
  admins?: Array<{ email: string; active?: boolean }>;
}

export function resolveAllowedPages(email: string, config: AccessConfig): EchoPage[] {
  const normalized = email.trim().toLowerCase();
  const isOwner = normalized === "admin@primephilippines.com";
  const isAdmin = config.admins?.some((admin) => admin.active !== false && admin.email.trim().toLowerCase() === normalized);
  if (isOwner || isAdmin) return ALL_PAGES;
  const rule = config.pagePermissions?.find((entry) => entry.email.trim().toLowerCase() === normalized);
  const configured = rule?.allowedPages?.length ? rule.allowedPages : config.defaultPageAccess?.length ? config.defaultPageAccess : ["forms"];
  return Array.from(new Set([...configured, "market-insights", "demands"])).filter((page): page is EchoPage => ALL_PAGES.includes(page as EchoPage));
}

export function sourcesEnabledForPages(pages: EchoPage[]): EchoSourcePage[] {
  return SOURCE_PAGES.filter((page) => pages.includes(page));
}
