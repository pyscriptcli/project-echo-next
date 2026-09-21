import { NextRequest, NextResponse } from "next/server";
import { cleanEnv, getTokenFromRequest, getUserFromRequest } from "@/lib/auth";

const MEETSTREAM_BASE_URL = "https://api.meetstream.ai/api/v1";

export async function GET(req: NextRequest, context: { params: Promise<{ botId: string }> }) {
  const token = getTokenFromRequest(req);
  const user = getUserFromRequest(req);
  if (!token || !user?.email) return NextResponse.json({ error: "Please sign in before checking the meeting bot." }, { status: 401 });

  const apiKey = cleanEnv(process.env.MEETSTREAM_API_KEY);
  if (!apiKey) return NextResponse.json({ error: "Meeting bot setup is not configured yet." }, { status: 503 });

  const { botId } = await context.params;
  if (!botId || !/^[a-zA-Z0-9_-]+$/.test(botId)) return NextResponse.json({ error: "Invalid meeting bot ID." }, { status: 400 });

  try {
    const response = await fetch(`${MEETSTREAM_BASE_URL}/bots/${encodeURIComponent(botId)}/status`, {
      headers: { Authorization: `Token ${apiKey}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: data.detail || data.message || "Unable to read meeting bot status." }, { status: response.status });
    return NextResponse.json({ botId, status: data.status || data.bot_status || data.bot?.status || "Unknown", detail: data });
  } catch (error) {
    console.error("[MeetStream] status lookup failed", error);
    return NextResponse.json({ error: "Unable to read meeting bot status." }, { status: 502 });
  }
}
