import { createClient } from "@supabase/supabase-js";

export type AdminConfig = Record<string, unknown> & {
  features: { askEchoEnabled: boolean };
};

export class AdminConfigError extends Error {
  status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = "AdminConfigError";
    this.status = status;
  }
}

function getClient() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
  if (!url || !key) throw new AdminConfigError("Supabase configuration is unavailable.");
  return createClient(url, key);
}

function normalizeConfig(value: unknown): AdminConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdminConfigError("Stored Admin configuration is invalid.");
  }
  const config = value as Record<string, unknown>;
  const features = config.features;
  if (features !== undefined && (typeof features !== "object" || features === null || Array.isArray(features))) {
    throw new AdminConfigError("Stored Admin feature configuration is invalid.");
  }
  return {
    ...config,
    features: {
      ...((features || {}) as Record<string, unknown>),
      askEchoEnabled: (features as Record<string, unknown> | undefined)?.askEchoEnabled !== false,
    },
  };
}

export async function loadAdminConfig(): Promise<AdminConfig> {
  const { data, error } = await getClient().from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
  if (error) throw new AdminConfigError("Admin configuration could not be loaded.");
  if (!data?.config) throw new AdminConfigError("The global Admin configuration is missing.");
  return normalizeConfig(data.config);
}

export async function saveAdminConfig(config: unknown): Promise<AdminConfig> {
  const normalized = normalizeConfig(config);
  const { data, error } = await getClient().from("echo_forms_config").upsert(
    { id: "global", config: normalized, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  ).select("config").single();
  if (error || !data?.config) throw new AdminConfigError("Admin configuration could not be saved.", 500);
  return normalizeConfig(data.config);
}

export async function isAskEchoEnabled(): Promise<boolean> {
  return (await loadAdminConfig()).features.askEchoEnabled === true;
}
