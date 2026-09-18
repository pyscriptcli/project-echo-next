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

    const { data, error } = await supabase
      .from("echo_user_preferences")
      .select("preferences")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ preferences: null });
    }

    return NextResponse.json({ preferences: data?.preferences || null });
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
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        await supabase
          .from("echo_user_preferences")
          .upsert(
            {
              email,
              preferences: body.preferences || body,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" }
          );
      } catch (err) {
        console.warn("[UserPreferences] Could not persist to Supabase:", err);
      }
    }

    return NextResponse.json({ success: true, preferences: body.preferences || body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update preferences" }, { status: 500 });
  }
}
