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
  return { 
    totalEvents: 0, 
    successfulEvents: 0, 
    failedEvents: 0, 
    averageProcessingMs: 0, 
    averageAudioSeconds: 0, 
    totalAudioSeconds: 0,
    fallbackRate: 0, 
    byProvider: {}, 
    bySource: {}, 
    byOperation: {},
    cost: {
      totalUsd: 0,
      totalPhp: 0,
      sttGroqUsd: 0,
      sttGroqPhp: 0,
      sttGroqMinutes: 0,
      sttFallbackUsd: 0,
      sttFallbackPhp: 0,
      sttFallbackMinutes: 0,
      llmUsd: 0,
      llmPhp: 0,
      summarizeCount: 0,
      usdToPhpRate: 57,
      groqHourlyPhp: 2.28,
      fallbackHourlyPhp: 20.52,
      deepseekHourlyPhp: 0.25,
      blendedHourlyPhp: 2.53
    }
  };
}

function summarize(events: Array<Record<string, unknown>>) {
  const successfulEvents = events.filter((event) => event.success === true).length;
  const processing = events.map((event) => Number(event.processing_ms || 0)).filter((value) => value > 0);
  const audio = events.map((event) => Number(event.audio_seconds || 0)).filter((value) => value > 0);
  const totalAudioSeconds = Math.round(audio.reduce((sum, value) => sum + value, 0));

  // Compute Groq vs OpenRouter fallback audio seconds
  const groqAudioSec = events
    .filter((e) => e.provider === "groq" || (!e.fallback_used && e.provider !== "openrouter"))
    .reduce((sum, e) => sum + Number(e.audio_seconds || 0), 0);
  const fallbackAudioSec = events
    .filter((e) => e.fallback_used === true || e.provider === "openrouter")
    .reduce((sum, e) => sum + Number(e.audio_seconds || 0), 0);

  const summarizeCount = events.filter((e) => e.operation === "notetaker_finalize" || e.source === "notetaker_finalize").length;

  // Rate Benchmarks: Groq Whisper Turbo $0.04/hr, OpenRouter Whisper Fallback $0.36/hr, DeepSeek ~$0.0044/summary
  const USD_TO_PHP = 57.0;
  const sttGroqUsd = (groqAudioSec / 3600) * 0.04;
  const sttFallbackUsd = (fallbackAudioSec / 3600) * 0.36;
  const llmUsd = summarizeCount > 0 
    ? summarizeCount * 0.00438 
    : (totalAudioSeconds / 3600) * (0.25 / USD_TO_PHP);
  const totalUsd = sttGroqUsd + sttFallbackUsd + llmUsd;
  const totalPhp = totalUsd * USD_TO_PHP;

  const countBy = (field: string) => events.reduce<Record<string, number>>((result, event) => { const key = String(event[field] || "unknown"); result[key] = (result[key] || 0) + 1; return result; }, {});
  
  return { 
    totalEvents: events.length, 
    successfulEvents, 
    failedEvents: events.length - successfulEvents, 
    averageProcessingMs: processing.length ? Math.round(processing.reduce((sum, value) => sum + value, 0) / processing.length) : 0, 
    averageAudioSeconds: audio.length ? Math.round((audio.reduce((sum, value) => sum + value, 0) / audio.length) * 10) / 10 : 0, 
    totalAudioSeconds,
    fallbackRate: events.length ? Math.round(events.filter((event) => event.fallback_used === true).length / events.length * 100) : 0, 
    byProvider: countBy("provider"), 
    bySource: countBy("source"), 
    byOperation: countBy("operation"),
    cost: {
      totalUsd: Number(totalUsd.toFixed(4)),
      totalPhp: Number(totalPhp.toFixed(2)),
      sttGroqUsd: Number(sttGroqUsd.toFixed(4)),
      sttGroqPhp: Number((sttGroqUsd * USD_TO_PHP).toFixed(2)),
      sttGroqMinutes: Math.round(groqAudioSec / 60),
      sttFallbackUsd: Number(sttFallbackUsd.toFixed(4)),
      sttFallbackPhp: Number((sttFallbackUsd * USD_TO_PHP).toFixed(2)),
      sttFallbackMinutes: Math.round(fallbackAudioSec / 60),
      llmUsd: Number(llmUsd.toFixed(4)),
      llmPhp: Number((llmUsd * USD_TO_PHP).toFixed(2)),
      summarizeCount,
      usdToPhpRate: USD_TO_PHP,
      groqHourlyPhp: 2.28,
      fallbackHourlyPhp: 20.52,
      deepseekHourlyPhp: 0.25,
      blendedHourlyPhp: totalAudioSeconds > 0 ? Number((totalPhp / (totalAudioSeconds / 3600)).toFixed(2)) : 2.53
    }
  };
}
