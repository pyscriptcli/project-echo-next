import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";

const OWNER_EMAIL = "admin@primephilippines.com";

async function isAdmin(email: string) {
  if (email === OWNER_EMAIL) return true;
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
  if (!url || !key) return false;
  const { data } = await createClient(url, key).from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
  return Boolean(data?.config?.admins?.some((admin: { email?: string; active?: boolean }) => admin.active !== false && String(admin.email).toLowerCase().trim() === email));
}

function range(req: NextRequest) {
  const now = new Date();
  const end = req.nextUrl.searchParams.get("end") || now.toISOString();
  const start = req.nextUrl.searchParams.get("start") || new Date(now.getTime() - 7 * 86400000).toISOString();
  return { start, end };
}

export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req) ? getUserFromRequest(req) : null;
  const email = String(user?.email || "").toLowerCase().trim();
  const testAdmin = req.cookies.get("echo_admin_test")?.value === "1";
  if (!testAdmin && (!email || !(await isAdmin(email)))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
  const { start, end } = range(req);
  if (!url || !key) return NextResponse.json({ start, end, events: [], summary: emptySummary(), configured: false });

  const client = createClient(url, key);
  const { data, error } = await client.from("echo_telemetry").select("*").gte("occurred_at", start).lte("occurred_at", end).order("occurred_at", { ascending: false }).limit(10000);
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ start, end, events: [], summary: emptySummary(), configured: false });
    return NextResponse.json({ error: "Unable to load telemetry." }, { status: 500 });
  }
  const events = data || [];
  const summary = summarize(events);
  if (req.nextUrl.searchParams.get("format") === "jsonl") {
    const body = events.map((event) => JSON.stringify(event)).join("\n");
    return new NextResponse(body, { headers: { "Content-Type": "application/x-ndjson", "Content-Disposition": `attachment; filename="echo-telemetry-${start.slice(0, 10)}-to-${end.slice(0, 10)}.jsonl"` } });
  }
  return NextResponse.json({ start, end, events, summary, configured: true });
}

function emptySummary() {
  return { totalEvents: 0, successfulEvents: 0, failedEvents: 0, averageProcessingMs: 0, averageAudioSeconds: 0, fallbackRate: 0, byProvider: {}, bySource: {}, byOperation: {} };
}

function summarize(events: Array<Record<string, unknown>>) {
  const successfulEvents = events.filter((event) => event.success === true).length;
  const processing = events.map((event) => Number(event.processing_ms || 0)).filter((value) => value > 0);
  const audio = events.map((event) => Number(event.audio_seconds || 0)).filter((value) => value > 0);
  const countBy = (field: string) => events.reduce<Record<string, number>>((result, event) => { const key = String(event[field] || "unknown"); result[key] = (result[key] || 0) + 1; return result; }, {});
  return { totalEvents: events.length, successfulEvents, failedEvents: events.length - successfulEvents, averageProcessingMs: processing.length ? Math.round(processing.reduce((sum, value) => sum + value, 0) / processing.length) : 0, averageAudioSeconds: audio.length ? Math.round((audio.reduce((sum, value) => sum + value, 0) / audio.length) * 10) / 10 : 0, fallbackRate: events.length ? Math.round(events.filter((event) => event.fallback_used === true).length / events.length * 100) : 0, byProvider: countBy("provider"), bySource: countBy("source"), byOperation: countBy("operation") };
}
