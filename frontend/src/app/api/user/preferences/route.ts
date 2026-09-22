import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const email = user?.email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ preferences: null });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ preferences: null });
    }

    let preferences = null;
    const { data, error } = await supabase
      .from("echo_user_preferences")
      .select("preferences")
      .eq("email", email)
      .maybeSingle();

    if (!error && data?.preferences) {
      preferences = data.preferences;
    } else {
      // Fallback: read from echo_forms_config global record
      try {
        const { data: globalData } = await supabase
          .from("echo_forms_config")
          .select("config")
          .eq("id", "global")
          .maybeSingle();
        if (globalData?.config?.userPreferences?.[email]) {
          preferences = globalData.config.userPreferences[email];
        }
      } catch (fbErr) {
        console.warn("[UserPreferences] Fallback read failed:", fbErr);
      }
    }

    return NextResponse.json({ preferences });
  } catch (err: any) {
    return NextResponse.json({ preferences: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const email = user?.email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const newPrefs = body.preferences || body;
    const supabase = getSupabaseClient();

    if (supabase) {
      let saved = false;
      try {
        const { error: upsertErr } = await supabase
          .from("echo_user_preferences")
          .upsert(
            {
              email,
              preferences: newPrefs,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" }
          );
        if (!upsertErr) saved = true;
      } catch (err) {
        // Ignored, fallback below
      }

      if (!saved) {
        // Fallback: persist in echo_forms_config global record
        try {
          const { data: globalData } = await supabase
            .from("echo_forms_config")
            .select("config")
            .eq("id", "global")
            .maybeSingle();
          const config = globalData?.config || {};
          const userPreferences = config.userPreferences || {};
          userPreferences[email] = {
            ...(userPreferences[email] || {}),
            ...newPrefs,
          };
          await supabase
            .from("echo_forms_config")
            .update({ config: { ...config, userPreferences } })
            .eq("id", "global");
        } catch (fbErr) {
          console.warn("[UserPreferences] Fallback write failed:", fbErr);
        }
      }
    }

    return NextResponse.json({ success: true, preferences: newPrefs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update preferences" }, { status: 500 });
  }
}
